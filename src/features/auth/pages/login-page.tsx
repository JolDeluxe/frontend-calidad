import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LoginForm } from '../components/login-form';
import { useAuthSession } from '@/providers/auth-provider';
import { getDefaultRouteForUser } from '@/app/router/route-guards';

const FONDOS_LOGIN = [
  '/loginEscritorio/1.webp',
  '/loginEscritorio/2.webp',
  '/loginEscritorio/3.webp',
];

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [fondoIndex, setFondoIndex] = useState(0);
  const { login } = useAuthSession();
  const navigate = useNavigate();

  // Rotación suave del carrusel de fondo cada 7 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setFondoIndex((prev) => (prev + 1) % FONDOS_LOGIN.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (usuario: string, password: string) => {
    setLoading(true);
    setBackendError(null);
    try {
      const loggedUser = await login({ usuario, password });
      if (loggedUser) {
        const destino = getDefaultRouteForUser(loggedUser.rol?.codigo);
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-900 px-4 select-none">
      {/* Carrusel de imágenes de fondo natural sin filtros */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {FONDOS_LOGIN.map((fondo, idx) => (
          <div
            key={fondo}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              idx === fondoIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url('${fondo}')` }}
          />
        ))}
      </div>

      {/* Contenedor flotante del Login */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-7 sm:p-9 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <img
            src="/img/01_Cuadra.webp"
            alt="MBC Cuadra"
            className="mx-auto h-12 w-auto object-contain mb-3 drop-shadow-sm"
          />
          <h1 className="fuente-titulos text-2xl font-bold uppercase tracking-wider text-marca-primario">
            Registro de Defectos
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-marca-acento mt-0.5">
            Sistema de Calidad
          </p>
        </div>

        <LoginForm
          loading={loading}
          backendError={backendError}
          onSubmit={handleLogin}
          onClearError={() => setBackendError(null)}
        />

        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
          <p className="text-[11px] font-medium text-slate-500">
            MBC Cuadra &bull; Procesos Tecnológicos
          </p>
        </div>
      </div>
    </div>
  );
}