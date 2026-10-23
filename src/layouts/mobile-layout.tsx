import { Outlet } from 'react-router';
import { MobileBottomNav } from './components/mobile-bottom-nav';
import { MobileHeader } from './components/mobile-header';
import { MobileSidebar } from './components/mobile-sidebar';
import { Footer } from './components/footer';

export function MobileLayout() {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-cuadra-arena text-app-text">
      <MobileHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-transparent custom-scrollbar flex flex-col">
        <div className="flex-1 px-4 pt-3 pb-4 flex flex-col gap-3">
          <Outlet />
        </div>
        <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          <Footer />
        </div>
      </main>
      <MobileBottomNav />
      <MobileSidebar />
    </div>
  );
}