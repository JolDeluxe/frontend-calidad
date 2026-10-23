import { Outlet } from 'react-router';
import { SistemaNav } from '../components/sistema-nav';
import { SystemHealthMonitorHeader } from '../components/monitor-salud-header';

export function SistemaLayoutPage() {
  return (
    <section className="space-y-4 pt-1 sm:pt-0">
      {/* 1. Monitor y Diagnóstico IA siempre visible en la parte superior */}
      <SystemHealthMonitorHeader />

      {/* 2. Botones de submódulos más pequeños y compactos por debajo */}
      <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2">
        <SistemaNav />
      </div>

      {/* 3. Submódulo activo (Auditoría, Logs o Consola) */}
      <div className="pt-1">
        <Outlet />
      </div>
    </section>
  );
}
