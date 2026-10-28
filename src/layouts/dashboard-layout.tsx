import { DesktopLayout } from './desktop-layout';

/**
 * DashboardLayout unificado:
 * En este sistema no existe menú mobile independiente; se utiliza exclusivamente
 * la experiencia de escritorio completa y fija para todas las resoluciones.
 */
export function DashboardLayout() {
  return <DesktopLayout />;
}
