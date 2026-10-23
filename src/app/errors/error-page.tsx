import { Link, useRouteError } from 'react-router';
import { ROUTES } from '@/app/router/route-paths';
import { Button } from '@/components/ui/button';

/**
 * Página de error genérico del sistema (SKILL.md §8).
 * Captura errores no controlados en el árbol de rutas (errorElement).
 *
 * MUST (SKILL.md §28): No mostrar stack traces ni mensajes técnicos al usuario final.
 */
export function ErrorPage() {
  const error = useRouteError();

  // Log solo en desarrollo — nunca en producción con datos sensibles
  if (import.meta.env.DEV) {
    console.error('[ErrorPage]', error);
  }

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-border">500</p>
        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          Ocurrió un error inesperado
        </h1>
        <p className="mt-2 text-text-secondary">
          Algo salió mal. Por favor, intenta recargar la página.
        </p>
        {import.meta.env.DEV && errorMessage && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded text-xs font-mono text-left break-all">
            {errorMessage}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Recargar página
          </Button>
          <Link to={ROUTES.ROOT}>
            <Button variant="outline">
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
