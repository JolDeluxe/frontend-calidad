import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { ApiError, authState, performTokenRefresh, connectivityState } from '@/lib/api/http-client';
import { authApi } from '@/features/auth/api/auth-api';
import type { UsuarioAuth, LoginCredentials } from '@/features/auth/types/auth.types';
import { idbDatabase } from '@/lib/db/idb-database';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import { offlineAuthClientService } from '@/features/auth/services/offline-crypto.service';
import { inspeccionesOfflineService } from '@/features/inspecciones/services/inspecciones-offline.service';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';

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
  isIdbAvailable: boolean; // True si IndexedDB está disponible para modo offline
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UsuarioAuth | null>;
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
  const [isIdbAvailable, setIsIdbAvailable] = useState<boolean>(true);

  // Inicialización de persistencia IndexedDB y recuperación de elementos interrumpidos al montar
  useEffect(() => {
    void idbDatabase.getDb().then((db) => {
      const ok = Boolean(db && idbDatabase.getAvailable());
      setIsIdbAvailable(ok);
      if (ok) {
        void inspeccionesOfflineService.recuperarElementosInterrumpidos().then(() => {
          void inspeccionesOfflineService.sincronizarCola();
        });
      }
    });
  }, []);

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
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        await authApi.logout();
      }
    } catch {
      // Ignorar error de red al cerrar sesión y limpiar únicamente la sesión activa
    } finally {
      authState.setAccessToken(null);
      persistUser(null);
      setSessionState('unauthenticated');
      // Purgar ÚNICAMENTE la sesión offline activa (`sesion_offline`), preservando intactos:
      // `cat_inspectores`, `cat_lotes`, `cat_defectos`, `cola_inspecciones` y `contingencias_inspecciones`
      void idbDatabase.delete('sesion_offline', 'activa');
    }
  }, [persistUser]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const result = await performTokenRefresh();

    if (result.status === 'success' && result.token) {
      let currentUser = result.user as UsuarioAuth | undefined;
      if (currentUser) {
        persistUser(currentUser);
      } else {
        try {
          const cached = localStorage.getItem(USER_STORAGE_KEY);
          currentUser = cached ? (JSON.parse(cached) as UsuarioAuth) : undefined;
        } catch {
          currentUser = undefined;
        }
      }
      setSessionState('confirmed');

      const esInspector = currentUser?.rol?.codigo?.toUpperCase() === 'INSPECTOR';
      const tieneTerminal = Boolean(terminalStorage.getCredential());

      // Solo emitir token offline individual si el usuario autenticado es INSPECTOR y la PC tiene terminal vinculada
      if (esInspector && tieneTerminal) {
        void catalogoOfflineService.sincronizarSesionOffline();
      }
      if (tieneTerminal) {
        void catalogoOfflineService.sincronizarTodoEnBackground();
        void inspeccionesOfflineService.sincronizarCola();
      }
      return true;
    }

    if (result.status === 'unauthorized') {
      // El backend rechazó la cookie de sesión (o el navegador aún no tiene cookie de sesión online).
      if (terminalStorage.getCredential()) {
        void catalogoOfflineService.sincronizarTodoEnBackground();
        void inspeccionesOfflineService.sincronizarCola();
      }

      authState.setAccessToken(null);
      persistUser(null);
      setSessionState('revoked');
      void idbDatabase.delete('sesion_offline', 'activa');
      return false;
    }

    // result.status === 'network_error': Fallo de conexión o backend inaccesible
    // Verificar primero si existe una sesión offline vigente en IndexedDB (`sesion_offline`)
    const sesionOfflineVigente = await catalogoOfflineService.getSesionOfflineVigente();
    if (sesionOfflineVigente) {
      const offlineUser: UsuarioAuth = {
        id: sesionOfflineVigente.inspectorId,
        usuario: sesionOfflineVigente.usuario,
        nombre: sesionOfflineVigente.nombre,
        rol: {
          id: 0,
          codigo: sesionOfflineVigente.rolCodigo || 'INSPECTOR',
          nombre: sesionOfflineVigente.rolCodigo || 'INSPECTOR',
        },
      };
      persistUser(offlineUser);
      setSessionState('offline_limited');
      return true;
    }

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
    async (credentials: LoginCredentials): Promise<UsuarioAuth | null> => {
      try {
        const response = await authApi.login(credentials);
        if (response.success && response.data?.accessToken && response.data?.usuario) {
          const loggedUser = response.data.usuario;
          authState.setAccessToken(response.data.accessToken);
          persistUser(loggedUser);
          setSessionState('confirmed');

          const esInspector = loggedUser.rol?.codigo?.toUpperCase() === 'INSPECTOR';
          const tieneTerminal = Boolean(terminalStorage.getCredential());

          if (esInspector && tieneTerminal) {
            void catalogoOfflineService.sincronizarSesionOffline();
          }
          if (tieneTerminal) {
            void catalogoOfflineService.sincronizarTodoEnBackground();
            void inspeccionesOfflineService.sincronizarCola();
          }
          return loggedUser;
        }
        return null;
      } catch (err: any) {
        // Si el servidor respondió con 400/401/403/404/429 (ApiError con respuesta HTTP de negocio),
        // NO hacer fallback offline: es un rechazo explícito del servidor en línea.
        if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) {
          throw err;
        }

        // Fallo de red (servidor caído, desconexión física o error 5xx de pasarela):
        // Intentar autenticación local multiusuario contra `cat_inspectores` en IndexedDB
        const offlineResult = await offlineAuthClientService.authenticateOffline({
          usuario: credentials.usuario,
          password: credentials.password,
        });

        authState.setAccessToken(null);
        persistUser(offlineResult.user);
        setSessionState('offline_limited');
        return offlineResult.user;
      }
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
    void initAuth();
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

    // Auto-recuperación cuando vuelve la conexión a Internet o el backend se enciende
    const checkReconnection = async () => {
      if (sessionState === 'offline_limited') {
        const isUp = await connectivityState.checkBackendHealth();
        if (isUp) {
          void refreshSession();
        }
      }
    };

    const handleBackendReachable = () => {
      if (sessionState === 'offline_limited') {
        void refreshSession();
      }
    };

    const handleOnline = () => {
      void catalogoOfflineService.sincronizarTodoEnBackground();
      void inspeccionesOfflineService.sincronizarCola({ forceIgnoreBackoff: true });
      void checkReconnection();
    };

    const handleFocus = () => {
      void checkReconnection();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkReconnection();
      }
    };

    // Iniciar stream en tiempo real de conectividad persistente
    connectivityState.startRealtimeDetection();

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('backend:reachable', handleBackendReachable);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('backend:reachable', handleBackendReachable);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [persistUser, refreshSession, sessionState]);

  // Si existe un usuario (en memoria/caché) y la sesión es confirmed u offline_limited
  const isAuthenticated = Boolean(
    user && (sessionState === 'confirmed' || sessionState === 'offline_limited'),
  );
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
        isIdbAvailable,
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
