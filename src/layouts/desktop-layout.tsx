import { Outlet } from 'react-router';
import { DesktopHeader } from './components/desktop-header';
import { DesktopSidebar } from './components/desktop-sidebar';
import { Footer } from './components/footer';
import { useAuthSession } from '@/providers/auth-provider';
import { getNavigationByRole } from '@/config/navigation-config';

export function DesktopLayout() {
  const { user } = useAuthSession();
  const navItems = getNavigationByRole(user?.rol?.codigo);
  // Si el usuario tiene 1 o menos rutas disponibles (ej. INSPECTOR que solo tiene /inspecciones),
  // no se muestra el sidebar para dejar la pantalla 100% limpia y dedicada a su módulo operativo.
  const mostrarSidebar = navItems.length > 1;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-cuadra-arena text-app-text">
      {mostrarSidebar && (
        <div className="relative z-30 h-full shrink-0 shadow-lg">
          <DesktopSidebar />
        </div>
      )}

      <div className="relative z-10 flex min-w-0 max-w-full flex-1 flex-col">
        <DesktopHeader />
        <main className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto bg-transparent custom-scrollbar flex flex-col">
          <div className="mx-auto w-full max-w-[1680px] min-w-0 flex-1 px-3 py-3 xl:px-5 xl:py-5 2xl:px-6 flex flex-col gap-4">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}