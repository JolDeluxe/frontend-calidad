import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';
import { httpClient, type ApiResponse } from '@/lib/api/http-client';

interface UsuarioSimpleLogin {
  id: number;
  usuario: string;
  nombre: string;
  rol: {
    id: number;
    codigo: string;
    nombre: string;
  };
}

interface UsuariosLoginResponse {
  inspectores: UsuarioSimpleLogin[];
  administradores: UsuarioSimpleLogin[];
}

export interface LoginFormProps {
  loading: boolean;
  backendError: string | null;
  onSubmit: (usuario: string, password: string) => Promise<void>;
  onClearError?: () => void;
}

export function LoginForm({
  loading,
  backendError,
  onSubmit,
  onClearError,
}: LoginFormProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [usuarioError, setUsuarioError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [inspectores, setInspectores] = useState<Array<{ usuario: string; nombre: string; inspectorId?: number }>>([]);
  const [administradores, setAdministradores] = useState<UsuarioSimpleLogin[]>([]);
  const [modoAdmin, setModoAdmin] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Cargar lista de inspectores y administradores desde el servidor o IndexedDB
  useEffect(() => {
    let mounted = true;

    async function cargarUsuarios() {
      // 1. Intentar cargar inspectores locales desde IndexedDB (modo offline)
      const locales = await catalogoOfflineService.getInspectoresLocales();
      if (mounted && locales.length > 0) {
        setInspectores(locales.map((l) => ({ usuario: l.usuario, nombre: l.nombre, inspectorId: l.inspectorId })));
      }

      // 2. Si hay conexión, consultar el endpoint público de usuarios para login
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        try {
          const res = await httpClient.get<ApiResponse<UsuariosLoginResponse>>('/auth/usuarios-login');
          const datos = res?.data;
          if (mounted && datos) {
            const { inspectores: inspServidor, administradores: adminServidor } = datos;
            if (inspServidor && inspServidor.length > 0) {
              setInspectores(
                inspServidor.map((i: UsuarioSimpleLogin) => ({
                  usuario: i.usuario,
                  nombre: i.nombre,
                  inspectorId: i.id,
                })),
              );
            }
            if (adminServidor && adminServidor.length > 0) {
              setAdministradores(adminServidor);
            }
          }
        } catch (e) {
          console.warn('No se pudo obtener la lista de usuarios online para el login:', e);
        }

        // Si la máquina tiene credencial de terminal, sincronizar catálogo offline
        const credencial = terminalStorage.getCredential();
        if (credencial) {
          try {
            await catalogoOfflineService.sincronizarInspectoresOffline();
            const actualizados = await catalogoOfflineService.getInspectoresLocales();
            if (mounted && actualizados.length > 0) {
              setInspectores(actualizados.map((l) => ({ usuario: l.usuario, nombre: l.nombre, inspectorId: l.inspectorId })));
            }
          } catch {
            // Ignorar errores de sincronización offline
          }
        }
      }
    }

    void cargarUsuarios();

    const handleOnlineStatus = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOffline(!online);
      if (online) {
        void cargarUsuarios();
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Detectar si existen nombres completos homónimos para desambiguar con `(@usuario)`
  const conteoNombres = useMemo(() => {
    const map = new Map<string, number>();
    for (const insp of inspectores) {
      const key = insp.nombre.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [inspectores]);

  // Lista de administradores ordenados:
  // - Administradores y Coordinadores regulares
  // - Visualizador y Super Admin ocultos / camuflados al final
  const adminsOrdenados = useMemo(() => {
    const regulares = administradores.filter(
      (a) => a.rol.codigo !== 'SUPER_ADMIN' && a.rol.codigo !== 'VISUALIZADOR',
    );
    const ocultos = administradores.filter(
      (a) => a.rol.codigo === 'SUPER_ADMIN' || a.rol.codigo === 'VISUALIZADOR',
    );
    return [...regulares, ...ocultos];
  }, [administradores]);

  const handleUsuarioChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUsuario(e.target.value);
    if (usuarioError) setUsuarioError(null);
    if (backendError && onClearError) onClearError();
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError(null);
    if (backendError && onClearError) onClearError();
  };

  const toggleModoAdmin = () => {
    setModoAdmin((prev) => !prev);
    setUsuario('');
    setUsuarioError(null);
    if (backendError && onClearError) onClearError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let hasErrors = false;
    if (!usuario.trim()) {
      setUsuarioError(
        modoAdmin
          ? 'Seleccione o ingrese un usuario administrativo'
          : 'Seleccione su nombre de la lista de inspectores',
      );
      hasErrors = true;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      hasErrors = true;
    }

    if (hasErrors) return;

    await onSubmit(usuario.trim(), password);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {isOffline && (
          <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Icon name="wifi_off" size="18px" className="shrink-0" />
            <span>
              Modo sin conexión activo. Los inspectores autorizados pueden iniciar sesión con su contraseña.
            </span>
          </div>
        )}

        {backendError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm"
          >
            <Icon name="error" size="20px" className="shrink-0 mt-0.5" />
            <span>{backendError}</span>
          </div>
        )}

        {/* SELECTOR DE USUARIO: MODO INSPECTOR O MODO ADMINISTRATIVO */}
        {!modoAdmin ? (
          /* VISTA PRINCIPAL: SELECTOR DE INSPECTORES SIEMPRE DISPONIBLE */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="usuario" error={Boolean(usuarioError)} className="flex items-center gap-2">
                <Icon name="badge" size="18px" /> INSPECTOR
              </Label>
              <button
                type="button"
                onClick={toggleModoAdmin}
                className="text-xs text-marca-secundario hover:text-marca-primario hover:underline cursor-pointer font-medium"
              >
                Entrar como Admin
              </button>
            </div>

            {inspectores.length > 0 ? (
              <select
                id="usuario"
                name="usuario"
                value={usuario}
                onChange={handleUsuarioChange}
                disabled={loading}
                className={`w-full px-3.5 py-2.5 rounded-sm border bg-white text-slate-800 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-marca-primario/40 ${
                  usuarioError ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">— Seleccione su usuario —</option>
                {inspectores.map((insp) => {
                  const esHomonimo = (conteoNombres.get(insp.nombre.trim().toLowerCase()) || 0) > 1;
                  const etiqueta = esHomonimo ? `${insp.nombre} (@${insp.usuario})` : insp.nombre;
                  return (
                    <option key={insp.usuario} value={insp.usuario}>
                      {etiqueta}
                    </option>
                  );
                })}
              </select>
            ) : (
              <Input
                id="usuario"
                type="text"
                name="usuario"
                autoComplete="username"
                placeholder="Cargando inspectores... o ingrese su usuario"
                value={usuario}
                onChange={handleUsuarioChange}
                error={Boolean(usuarioError)}
                helperText={usuarioError ?? undefined}
                disabled={loading}
              />
            )}
            {usuarioError && <span className="text-xs text-red-500 mt-0.5">{usuarioError}</span>}
          </div>
        ) : (
          /* VISTA ADMINISTRATIVA: SELECTOR DE ADMIN / COORD CON SUPER ADMIN Y VISUALIZADOR OCULTOS AL FINAL */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="usuario" error={Boolean(usuarioError)} className="flex items-center gap-2">
                <Icon name="admin_panel_settings" size="18px" /> PERSONAL ADMINISTRATIVO
              </Label>
              <button
                type="button"
                onClick={toggleModoAdmin}
                className="text-xs text-marca-secundario hover:text-marca-primario hover:underline cursor-pointer font-medium"
              >
                ← Volver a Inspectores
              </button>
            </div>

            <select
              id="usuario"
              name="usuario"
              value={usuario}
              onChange={handleUsuarioChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 rounded-sm border bg-white text-slate-800 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-marca-primario/40 ${
                usuarioError ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="">— Seleccione usuario administrativo —</option>
              {adminsOrdenados.map((adm) => {
                const esOculto = adm.rol.codigo === 'SUPER_ADMIN' || adm.rol.codigo === 'VISUALIZADOR';
                return (
                  <option
                    key={adm.id}
                    value={adm.usuario}
                    className={
                      esOculto
                        ? 'text-white bg-white hover:text-slate-300 select-none' // Camuflado en blanco hasta abajo
                        : 'text-slate-800 font-medium'
                    }
                  >
                    {esOculto ? `ㅤㅤ${adm.nombre}ㅤㅤ` : adm.nombre}
                  </option>
                );
              })}
            </select>
            {usuarioError && <span className="text-xs text-red-500 mt-0.5">{usuarioError}</span>}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" error={Boolean(passwordError)} className="flex items-center gap-2">
            <Icon name="lock" size="18px" /> CONTRASEÑA
          </Label>
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={handlePasswordChange}
            error={Boolean(passwordError)}
            helperText={passwordError ?? undefined}
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="mt-3 py-3 w-full cursor-pointer bg-marca-primario hover:bg-marca-primario-hover"
        >
          Entrar al Sistema
        </Button>
      </form>
    </div>
  );
}
