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
    <header className="sticky top-0 z-[70] border-b border-slate-200 bg-white shadow-sm shrink-0">
      <div className="grid grid-cols-3 items-center gap-4 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <Icon
            name="dashboard"
            size={!sidebarExpanded ? '28px' : '22px'}
            className="text-marca-acento transition-all duration-300 shrink-0"
          />
          <h2
            className={`truncate font-normal uppercase text-marca-primario fuente-titulos transition-all duration-300 ${
              !sidebarExpanded ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </h2>
          {isOfflineMode && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300 shadow-xs shrink-0"
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
            className="h-7 sm:h-9 w-auto object-contain"
          />
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {/* <button
            type="button"
            onClick={() => window.open('/proyeccion', '_blank', 'noopener,noreferrer')}
            title="Abrir Modo Proyección (Kiosco / TV) en pestaña dedicada"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider"
          >
            <Icon name="tv" size="18px" className="text-slate-950" />
            <span className="hidden md:inline">Proyectar</span>
          </button> */}

          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Recargar página"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <Icon name="refresh" size="18px" className="text-slate-500" />
            <span className="hidden sm:inline">Recargar</span>
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}