import { useLocation, useNavigate } from 'react-router';
import { getNavigationByRole } from '@/config/navigation-config';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';
import { useAuthSession } from '@/providers/auth-provider';
import { uiStore } from '@/stores/ui-store';

export function MobileBottomNav() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const items = getNavigationByRole(user?.rol?.codigo);

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 px-2 border-t border-white/40 bg-white/75 backdrop-blur-xl shadow-[-8px_0_30px_rgba(15,23,42,0.08)]">
      <nav className="flex items-center justify-around pb-1 relative z-10">
        {items.map((item) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className="relative flex flex-col items-center justify-center w-full py-1 outline-none cursor-pointer group"
            >
              <div
                className={cn(
                  'flex items-center justify-center w-16 h-8 rounded-full transition-all duration-300 relative overflow-hidden',
                  isActive
                    ? 'bg-marca-primario text-white shadow-sm'
                    : 'bg-transparent text-marca-primario/70 hover:bg-white/30',
                )}
              >
                <Icon name={item.icon} size="22px" weight={isActive ? 600 : 400} />
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold mt-1 transition-colors duration-300 tracking-wide',
                  isActive ? 'text-marca-primario' : 'text-marca-primario/60',
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => uiStore.toggleMobileMenu()}
          className="relative flex flex-col items-center justify-center w-full py-1 outline-none cursor-pointer group"
        >
          <div className="flex items-center justify-center w-16 h-8 rounded-full bg-transparent text-marca-primario/70 hover:bg-white/30 transition-all duration-300">
            <Icon name="menu" size="22px" />
          </div>
          <span className="text-[10px] font-bold mt-1 text-marca-primario/60 tracking-wide">
            Menú
          </span>
        </button>
      </nav>
    </div>
  );
}