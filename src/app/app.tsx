import { RouterProvider } from 'react-router';
import { router } from './router/router';
import { AppProviders } from './providers/app-providers';

/**
 * Componente raíz de la aplicación (patrón: main.tsx → app.tsx → AppProviders → RouterProvider → routes).
 */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
