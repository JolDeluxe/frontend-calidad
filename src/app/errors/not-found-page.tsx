import { Link } from 'react-router';
import { ROUTES } from '@/app/router/route-paths';
import { Button } from '@/components/ui/button';

/**
 * Página 404 — ruta no encontrada (SKILL.md §8).
 * Renderizada como catch-all (* route) en el árbol de rutas.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-border">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          Página no encontrada
        </h1>
        <p className="mt-2 text-text-secondary">
          La dirección que buscas no existe o fue movida.
        </p>
        <Link to={ROUTES.ROOT} className="mt-6 inline-block">
          <Button variant="primary">
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
