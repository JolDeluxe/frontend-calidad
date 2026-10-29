import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LoginForm } from '../components/login-form';
import { useAuthSession } from '@/providers/auth-provider';
import { ROUTES } from '@/app/router/route-paths';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const { login } = useAuthSession();
  const navigate = useNavigate();

  const handleLogin = async (usuario: string, password: string) => {
    setLoading(true);
    setBackendError(null);
    try {
      const loggedUser = await login({ usuario, password });
      if (loggedUser) {
        const esInspector = loggedUser.rol?.codigo?.toUpperCase() === 'INSPECTOR';
        const destino = esInspector ? ROUTES.INSPECCIONES : ROUTES.ROOT;
        navigate(destino, { replace: true });
      } else {
        setBackendError('Credenciales inválidas o cuenta inactiva');
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error inesperado al iniciar sesión';
      setBackendError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cuadra-arena px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-sm shadow-md p-8">
        <div className="text-center mb-6">
          <h1 className="fuente-titulos text-3xl font-bold text-marca-primario">
            MBC CUADRA
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inicio de Sesión — 10_proyecto_calidad
          </p>
        </div>

        <LoginForm
          loading={loading}
          backendError={backendError}
          onSubmit={handleLogin}
          onClearError={() => setBackendError(null)}
        />
      </div>
    </div>
  );
}