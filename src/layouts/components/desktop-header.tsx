import { useLocation } from 'react-router';
import { getRouteTitle } from '@/config/navigation-config';
import { Icon } from '@/components/ui/icon';
import { UserMenu } from './user-menu';
import { useUIStore } from '@/stores/ui-store';
import { useAuthSession } from '@/providers/auth-provider';

export function DesktopHeader() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded);
  const { isOfflineMode } = useAuthSession();

  return (
    <header className="sticky top-0 z-[70] border-b border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-3 items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <Icon
            name="dashboard"
            size={!sidebarExpanded ? '32px' : '24px'}
            className="hidden text-marca-acento transition-all duration-300 sm:block"
          />
          <h2
            className={`hidden truncate font-normal uppercase text-marca-primario fuente-titulos transition-all duration-300 md:block ${
              !sidebarExpanded ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </h2>
          {isOfflineMode && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300 shadow-xs"
              title="Trabajando con sesión persistente en caché local. Los cambios se sincronizarán al reconectar."
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Modo sin conexión
            </span>
          )}
        </div>

        <div className="flex items-center justify-center">
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="h-8 w-auto object-contain sm:h-10"
          />
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}