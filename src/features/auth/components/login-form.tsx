import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';
import type { InspectorOfflineStore } from '@/lib/db/idb-database';

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

  const [inspectores, setInspectores] = useState<InspectorOfflineStore[]>([]);
  const [modoManualAdmin, setModoManualAdmin] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Cargar inspectores precargados en IndexedDB y actualizar desde el servidor si la PC es una terminal vinculada
  useEffect(() => {
    let mounted = true;

    async function cargarInspectores() {
      const locales = await catalogoOfflineService.getInspectoresLocales();
      if (mounted && locales.length > 0) {
        setInspectores(locales);
      }

      const credencial = terminalStorage.getCredential();
      if (credencial && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        await catalogoOfflineService.sincronizarInspectoresOffline();
        const actualizados = await catalogoOfflineService.getInspectoresLocales();
        if (mounted) {
          setInspectores(actualizados);
        }
      }
    }

    void cargarInspectores();

    const handleOnlineStatus = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOffline(!online);
      if (online) {
        void cargarInspectores();
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

  // Detectar si existen nombres completos homónimos para desambiguar con `(@usuario)` cuando sea necesario
  const conteoNombres = useMemo(() => {
    const map = new Map<string, number>();
    for (const insp of inspectores) {
      const key = insp.nombre.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [inspectores]);

  const mostrarSelectorInspector = inspectores.length > 0 && !modoManualAdmin;

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

  const toggleModoLogin = () => {
    setModoManualAdmin((prev) => !prev);
    setUsuario('');
    setUsuarioError(null);
    if (backendError && onClearError) onClearError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let hasErrors = false;
    if (!usuario.trim()) {
      setUsuarioError(
        mostrarSelectorInspector
          ? 'Seleccione su nombre de la lista de inspectores'
          : 'El usuario es requerido',
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
              Modo sin conexión activo. Los inspectores autorizados en esta terminal pueden iniciar sesión con su contraseña.
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

        {mostrarSelectorInspector ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="usuario" error={Boolean(usuarioError)} className="flex items-center gap-2">
                <Icon name="badge" size="18px" /> INSPECTOR (NOMBRE COMPLETO)
              </Label>
              <button
                type="button"
                onClick={toggleModoLogin}
                className="text-xs text-primary hover:underline cursor-pointer font-medium"
              >
                Acceso administrativo / otro usuario
              </button>
            </div>
            <select
              id="usuario"
              name="usuario"
              value={usuario}
              onChange={handleUsuarioChange}
              disabled={loading}
              className={`w-full px-3.5 py-2.5 rounded-md border bg-background text-foreground text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                usuarioError ? 'border-red-500' : 'border-input'
              }`}
            >
              <option value="">— Seleccione su nombre completo —</option>
              {inspectores.map((insp) => {
                const esHomonimo = (conteoNombres.get(insp.nombre.trim().toLowerCase()) || 0) > 1;
                const etiqueta = esHomonimo ? `${insp.nombre} (@${insp.usuario})` : insp.nombre;
                return (
                  <option key={insp.inspectorId} value={insp.usuario}>
                    {etiqueta}
                  </option>
                );
              })}
            </select>
            {usuarioError && <span className="text-xs text-red-500 mt-0.5">{usuarioError}</span>}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="usuario" error={Boolean(usuarioError)} className="flex items-center gap-2">
                <Icon name="person" size="18px" /> USUARIO
              </Label>
              {inspectores.length > 0 && (
                <button
                  type="button"
                  onClick={toggleModoLogin}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Seleccionar inspector por nombre
                </button>
              )}
            </div>
            <Input
              id="usuario"
              type="text"
              name="usuario"
              autoComplete="username"
              placeholder="Ingrese su usuario o nombre completo"
              value={usuario}
              onChange={handleUsuarioChange}
              error={Boolean(usuarioError)}
              helperText={usuarioError ?? undefined}
              disabled={loading}
              autoFocus
            />
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
          className="mt-3 py-3 w-full cursor-pointer"
        >
          Entrar al Sistema
        </Button>
      </form>
    </div>
  );
}
