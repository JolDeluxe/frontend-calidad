import { useIsDesktop } from '@/hooks/useMediaQuery';
import { DesktopLayout } from './desktop-layout';
import { MobileLayout } from './mobile-layout';

export function DashboardLayout() {
  const isDesktop = useIsDesktop();

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
}