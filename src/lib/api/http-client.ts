import { env } from '@/config/env';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface ApiErrorResponse {
  success?: boolean;
  message: string;
  errors?: unknown;
  statusCode?: number;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorResponse;

  constructor(statusCode: number, body: ApiErrorResponse) {
    super(body.message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface CustomRequestInit extends RequestInit {
  _isRetry?: boolean;
  params?: Record<string, unknown>;
}

let inMemoryAccessToken: string | null = null;

export const authState = {
  getAccessToken: (): string | null => inMemoryAccessToken,
  setAccessToken: (token: string | null): void => {
    inMemoryAccessToken = token;
  },
};

export type RefreshStatus = 'success' | 'unauthorized' | 'network_error';

export interface RefreshResultData {
  status: RefreshStatus;
  token: string | null;
  user?: unknown;
}

let activeRefreshPromise: Promise<RefreshResultData> | null = null;

export async function performTokenRefresh(): Promise<RefreshResultData> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async (): Promise<RefreshResultData> => {
    try {
      const url = `${env.API_BASE_URL}/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 401 || response.status === 403) {
        authState.setAccessToken(null);
        return { status: 'unauthorized', token: null };
      }

      if (!response.ok) {
        // Errores 5xx u otros códigos del servidor: fallo temporal del backend
        return { status: 'network_error', token: null };
      }

      const payload = (await response.json()) as ApiResponse<{
        accessToken: string;
        usuario?: unknown;
      }>;

      const newToken = payload.data?.accessToken ?? null;
      authState.setAccessToken(newToken);

      if (newToken) {
        window.dispatchEvent(
          new CustomEvent('auth:token-refreshed', {
            detail: { token: newToken, user: payload.data?.usuario },
          }),
        );
      }

      return { status: 'success', token: newToken, user: payload.data?.usuario };
    } catch {
      // Error de red, fetch abortado, servidor caído / offline
      return { status: 'network_error', token: null };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

async function request<T>(path: string, options: CustomRequestInit = {}): Promise<T> {
  let url = `${env.API_BASE_URL}${path}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = authState.getAccessToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (response.status === 401) {
    const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');

    if (isAuthEndpoint || options._isRetry) {
      if (!path.startsWith('/auth/login')) {
        authState.setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { status: 401 } }));
      }
      const errorBody = (await response.json().catch(() => ({ message: 'No autorizado' }))) as ApiErrorResponse;
      throw new ApiError(401, errorBody);
    }

    const refreshResult = await performTokenRefresh();
    if (refreshResult.status === 'success' && refreshResult.token) {
      return request<T>(path, {
        ...options,
        _isRetry: true,
        headers: {
          ...headers,
          Authorization: `Bearer ${refreshResult.token}`,
        },
      });
    }

    if (refreshResult.status === 'unauthorized') {
      authState.setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { status: 401 } }));
      const errorBody = (await response.json().catch(() => ({ message: 'Sesión expirada' }))) as ApiErrorResponse;
      throw new ApiError(401, errorBody);
    }

    // En caso de fallo temporal de red durante refresh, no emitimos session-expired para no expulsar al usuario
    const errorBody = (await response.json().catch(() => ({ message: 'Servidor no disponible temporalmente' }))) as ApiErrorResponse;
    throw new ApiError(503, errorBody);
  }

  if (response.status === 403) {
    const errorBody = (await response.json().catch(() => ({ message: 'Acceso denegado' }))) as ApiErrorResponse;
    throw new ApiError(403, errorBody);
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      message: `Error ${response.status}: ${response.statusText}`,
    }))) as ApiErrorResponse;
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const httpClient = {
  get: <T>(path: string, options?: CustomRequestInit) => request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body?: unknown, options?: CustomRequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(path: string, body?: unknown, options?: CustomRequestInit) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(path: string, body?: unknown, options?: CustomRequestInit) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(path: string, options?: CustomRequestInit) => request<T>(path, { method: 'DELETE', ...options }),
};