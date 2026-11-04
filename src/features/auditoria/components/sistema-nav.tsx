import { SectionTabs, type SectionTabItem } from '@/components/ui/section-tabs';
import { ROUTES } from '@/app/router/route-paths';

const SISTEMA_AUDITORIA_TABS: SectionTabItem[] = [
  {
    id: 'auditoria',
    label: 'Auditoría',
    to: ROUTES.AUDITORIA_EVENTOS,
    icon: 'history',
    end: true,
  },
  {
    id: 'logs',
    label: 'Logs',
    to: ROUTES.AUDITORIA_LOGS,
    icon: 'description',
  },
  {
    id: 'consola',
    label: 'Consola',
    to: ROUTES.AUDITORIA_CONSOLA,
    icon: 'terminal',
  },
  {
    id: 'terminales',
    label: 'Terminales',
    to: ROUTES.AUDITORIA_TERMINALES,
    icon: 'devices',
  },
  {
    id: 'matriz-visibilidad',
    label: 'Matriz Visibilidad',
    to: ROUTES.MATRIZ_VISIBILIDAD,
    icon: 'grid_view',
  },
];

export interface SistemaNavProps {
  className?: string;
}

export function SistemaNav({ className = '' }: SistemaNavProps) {
  return (
    <SectionTabs
      tabs={SISTEMA_AUDITORIA_TABS}
      className={className}
      label="Submódulos del Sistema"
    />
  );
}
