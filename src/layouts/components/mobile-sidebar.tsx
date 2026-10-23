import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import { getNavigationByRole } from '@/config/navigation-config';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';
import { useAuthSession } from '@/providers/auth-provider';
import { useUIStore, uiStore } from '@/stores/ui-store';

export function MobileSidebar() {
  const { user, logout } = useAuthSession();
  const open = useUIStore((s) => s.mobileMenuOpen);
  const location = useLocation();
  const items = getNavigationByRole(user?.rol?.codigo);

  useEffect(() => {
    if (open) uiStore.setMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') uiStore.setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[4px] transition-opacity duration-300 animate-in fade-in"
        onClick={() => uiStore.setMobileMenuOpen(false)}
        aria-label="Cerrar navegación"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[82vw] max-w-xs flex-col overflow-hidden border-l border-white/40 bg-white/90 shadow-[-16px_0_40px_rgba(72,43,44,0.18)] backdrop-blur-xl saturate-[160%] animate-in slide-in-from-right duration-300">
        <div className="flex shrink-0 items-center justify-between border-b border-marca-primario/10 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-white/40">
          <div>
            <p className="fuente-titulos text-xl font-normal uppercase tracking-wider text-marca-primario">
              MBC CUADRA
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-marca-acento">
              10_proyecto_calidad
            </p>
          </div>
          <button
            type="button"
            onClick={() => uiStore.setMobileMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-marca-primario shadow-sm hover:bg-white/80 active:scale-95 transition-all cursor-pointer"
            aria-label="Cerrar menú"
          >
            <Icon name="close" size="20px" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.route}
                  end={item.route === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all active:scale-[0.98]',
                      isActive
                        ? 'bg-marca-primario text-white shadow-md shadow-marca-primario/20'
                        : 'text-slate-700 hover:bg-white/50 hover:text-marca-primario',
                    )
                  }
                >
                  <Icon name={item.icon} size="22px" className="shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-marca-primario/10 bg-white/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-secundario text-xs font-black text-white shadow-sm">
              {(user?.nombre || user?.usuario || 'U').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-marca-primario">
                {user?.nombre || user?.usuario}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-marca-secundario">
                {user?.rol?.nombre || user?.rol?.codigo}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void logout()}
            variant="danger"
            icon="logout"
            className="w-full h-9 text-xs font-black cursor-pointer"
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </div>
  );
}