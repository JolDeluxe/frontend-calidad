import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authState, performTokenRefresh } from '@/lib/api/http-client';
import { authApi } from '@/features/auth/api/auth-api';
import type { UsuarioAuth, LoginCredentials } from '@/features/auth/types/auth.types';

export type SessionState =
  | 'confirmed' // Sesión confirmada por el servidor (token de acceso vigente)
  | 'pending_validation' // Validación pendiente al iniciar o reconectar
  | 'offline_limited' // Modo offline limitado: servidor inaccesible, interfaz con caché local disponible
  | 'revoked' // Sesión rechazada o revocada por el servidor
  | 'unauthenticated'; // Sin sesión previa

export interface AuthContextValue {
  user: UsuarioAuth | null;
  sessionState: SessionState;
  isAuthenticated: boolean; // True si confirmed o offline_limited (para navegación en shell)
  isServerConfirmed: boolean; // True solo si hay validación activa del servidor
  isOfflineMode: boolean; // True si estamos en offline_limited
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = 'auth_user_cache';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioAuth | null>(() => {
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? (JSON.parse(cached) as UsuarioAuth) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionState, setSessionState] = useState<SessionState>('pending_validation');

  const persistUser = useCallback((userData: UsuarioAuth | null) => {
    if (!userData) {
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignorar error de red y purgar local
    } finally {
      authState.setAccessToken(null);
      persistUser(null);
      setSessionState('unauthenticated');
    }
  }, [persistUser]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const result = await performTokenRefresh();

    if (result.status === 'success' && result.token) {
      if (result.user) {
        persistUser(result.user as UsuarioAuth);
      }
      setSessionState('confirmed');
      return true;
    }

    if (result.status === 'unauthorized') {
      // El backend explícitamente rechazó la sesión (expiró, fue revocada o usuario inactivo)
      authState.setAccessToken(null);
      persistUser(null);
      setSessionState('revoked');
      return false;
    }

    // result.status === 'network_error': Fallo de conexión o backend inaccesible
    // NO destruimos la sesión ni purgamos al usuario local. Si tenemos datos en caché, entramos en modo offline limitado.
    const cached = localStorage.getItem(USER_STORAGE_KEY);
    if (cached) {
      try {
        const cachedUser = JSON.parse(cached) as UsuarioAuth;
        setUser(cachedUser);
        setSessionState('offline_limited');
        return true;
      } catch {
        // Formato corrupto
      }
    }

    setSessionState('unauthenticated');
    return false;
  }, [persistUser]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      const response = await authApi.login(credentials);
      if (response.success && response.data?.accessToken && response.data?.usuario) {
        authState.setAccessToken(response.data.accessToken);
        persistUser(response.data.usuario);
        setSessionState('confirmed');
        return true;
      }
      return false;
    },
    [persistUser],
  );

  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        await refreshSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    initAuth();
    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  useEffect(() => {
    const handleSessionExpired = () => {
      authState.setAccessToken(null);
      persistUser(null);
      setSessionState('revoked');
    };

    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string; user?: UsuarioAuth }>;
      if (customEvent.detail.user) {
        persistUser(customEvent.detail.user);
      }
      setSessionState('confirmed');
    };

    // Auto-recuperación cuando vuelve la conexión a Internet o el navegador vuelve a foco
    const handleOnline = () => {
      refreshSession();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
      window.removeEventListener('online', handleOnline);
    };
  }, [persistUser, refreshSession]);

  // Si existe un usuario (en memoria/caché) y la sesión es confirmed u offline_limited
  const isAuthenticated = Boolean(user && (sessionState === 'confirmed' || sessionState === 'offline_limited'));
  const isServerConfirmed = sessionState === 'confirmed';
  const isOfflineMode = sessionState === 'offline_limited';

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionState,
        isAuthenticated,
        isServerConfirmed,
        isOfflineMode,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthSession debe ser usado dentro de un <AuthProvider>');
  }
  return context;
}