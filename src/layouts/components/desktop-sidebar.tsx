import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router';
import { getNavigationByRole } from '@/config/navigation-config';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { useAuthSession } from '@/providers/auth-provider';
import { useUIStore, uiStore } from '@/stores/ui-store';

export function DesktopSidebar() {
  const { user } = useAuthSession();
  const sidebarExpanded = useUIStore((s) => s.sidebarExpanded);
  const sidebarRef = useRef<HTMLElement>(null);
  const items = getNavigationByRole(user?.rol?.codigo);

  useEffect(() => {
    if (!sidebarExpanded) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        uiStore.setSidebarExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarExpanded]);

  const handleSidebarClick = (event: React.MouseEvent) => {
    if (sidebarExpanded) return;
    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;
    uiStore.setSidebarExpanded(true);
  };

  return (
    <aside
      ref={sidebarRef}
      onClick={handleSidebarClick}
      className={cn(
        'relative flex h-full shrink-0 flex-col bg-marca-secundario text-white transition-[width] duration-300 ease-in-out select-none',
        sidebarExpanded ? 'w-72' : 'w-20 cursor-pointer',
      )}
    >
      <div className="sidebar-header relative flex h-20 shrink-0 items-center justify-center border-b border-marca-primario/20 py-2">
        <div className="flex h-full w-full items-center justify-center px-4">
          {sidebarExpanded ? (
            <img
              src="/img/01_Cuadra.webp"
              alt="Cuadra"
              className="sidebar-logo h-12 max-h-14 w-auto max-w-[230px] object-contain transition-all duration-300"
            />
          ) : (
            <img
              src="/img/02_Cuadra_C_Logo.webp"
              alt="Cuadra"
              className="sidebar-logo-collapsed h-11 w-11 shrink-0 object-contain transition-all duration-300"
            />
          )}
        </div>
        <Tooltip text={sidebarExpanded ? 'Contraer menú' : 'Expandir menú'} position="right">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              uiStore.toggleSidebar();
            }}
            variant="icon"
            size="icon"
            icon={sidebarExpanded ? 'chevron_left' : 'chevron_right'}
            className="absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-marca-primario bg-white p-0 text-marca-primario shadow-md hover:scale-110 hover:-translate-y-1/2 hover:shadow-lg"
            aria-label={sidebarExpanded ? 'Contraer menú' : 'Expandir menú'}
          />
        </Tooltip>
      </div>

      <nav className="sidebar-nav min-h-0 flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
        <ul className="relative space-y-1">
          {items.map((item, index) => {
            if (item.isDivider) {
              return <li key={item.id || index} className="my-4 h-px bg-white/10" />;
            }

            return (
              <li key={item.id}>
                <Tooltip text={item.name} position="right" disabled={sidebarExpanded}>
                  <NavLink
                    to={item.route}
                    end={item.route === '/'}
                    className={({ isActive }) =>
                      cn(
                        'sidebar-item-link relative flex min-h-12 w-full items-center gap-3 rounded-sm px-4 py-3 text-sm transition-all duration-200',
                        sidebarExpanded ? 'justify-start' : 'justify-center',
                        isActive
                          ? 'bg-marca-acento text-white font-semibold shadow-lg'
                          : 'text-white/80 hover:bg-marca-primario/30 hover:text-white',
                      )
                    }
                  >
                    <Icon name={item.icon} size="24px" className="sidebar-item-icon shrink-0" />
                    <span
                      className={cn(
                        'whitespace-nowrap text-left transition-all duration-300 ease-in-out',
                        sidebarExpanded
                          ? 'flex-1 translate-x-0 opacity-100'
                          : 'w-0 -translate-x-4 overflow-hidden opacity-0',
                      )}
                    >
                      {item.name}
                    </span>
                  </NavLink>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          'sidebar-footer mt-auto flex flex-col items-center border-t border-marca-primario/30 p-4 text-center text-[11px] leading-5 text-white/50 transition-all duration-300',
          sidebarExpanded ? 'opacity-100' : 'hidden opacity-0',
        )}
      >
        <p className="fuente-titulos whitespace-nowrap text-xl uppercase tracking-wide text-white">
          10_proyecto_calidad
        </p>
        <p className="font-codigo mt-1 rounded-sm bg-marca-primario/50 px-2 py-0.5 text-[10px] text-cuadra-arena shadow-inner">
          v.1.0.0
        </p>
        <p className="mt-3 text-[10px] leading-tight text-white/50">
          MBC Cuadra <br />
          <span className="font-bold text-white/80">Procesos Tecnológicos</span>
        </p>
      </div>
    </aside>
  );
}