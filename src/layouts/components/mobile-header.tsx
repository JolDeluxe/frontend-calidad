import { Link, useLocation } from 'react-router';
import { getRouteTitle } from '@/config/navigation-config';
import { Icon } from '@/components/ui/icon';
import { useAuthSession } from '@/providers/auth-provider';
import { uiStore, useUIStore } from '@/stores/ui-store';

export function MobileHeader() {
  const location = useLocation();
  const { user, isOfflineMode } = useAuthSession();
  const isMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const title = getRouteTitle(location.pathname);
  const initial = (user?.nombre || user?.usuario || 'U').charAt(0).toUpperCase();

  return (
    <header className="relative z-30 shrink-0 border-b border-white/50 bg-cuadra-arena/70 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-2xl saturate-[150%]">
      {isOfflineMode && (
        <div className="mb-2 -mt-1 flex items-center justify-center gap-1.5 rounded-md bg-amber-500/10 py-1 text-[11px] font-semibold text-amber-900 border border-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
          Modo sin conexión
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => uiStore.toggleMobileMenu()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/40 text-marca-primario shadow-sm hover:bg-white/60 transition-transform duration-200 active:scale-95 cursor-pointer"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir navegación'}
          aria-expanded={isMenuOpen}
        >
          <Icon name={isMenuOpen ? 'close' : 'menu'} size="24px" />
        </button>
        <Link to="/" className="absolute left-1/2 min-w-0 -translate-x-1/2 text-center">
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="mx-auto h-8 w-auto object-contain drop-shadow-sm"
          />
          <p className="mt-0.5 max-w-36 truncate text-[10px] font-black uppercase tracking-[0.18em] text-marca-acento">
            {title}
          </p>
        </Link>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-marca-secundario/20 bg-marca-secundario text-sm font-black text-white shadow-sm"
          aria-label="Perfil"
        >
          {initial}
        </span>
      </div>
    </header>
  );
}