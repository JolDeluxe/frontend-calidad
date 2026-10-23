import { type ReactNode } from 'react';
import {
  ESTADO_REGISTRO_CONFIG,
  ESTADO_GENERAL_CONFIG,
  type StatusVisualConfig,
  type EstadoRegistro,
  type EstadoGeneral,
} from '@/config/status-config';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

export interface StatusBadgeProps {
  estadoRegistro?: EstadoRegistro;
  estadoGeneral?: EstadoGeneral;
  label?: string;
  variant?: 'emerald' | 'amber' | 'sky' | 'rose' | 'zinc';
  className?: string;
  showIcon?: boolean;
}

/**
 * Componente unificado para badges de estado del Sistema de Calidad.
 */
export function StatusBadge({
  estadoRegistro,
  estadoGeneral,
  label,
  variant,
  className,
  showIcon = true,
}: StatusBadgeProps): ReactNode {
  let config: StatusVisualConfig | undefined;

  if (estadoRegistro) {
    config = ESTADO_REGISTRO_CONFIG[estadoRegistro];
  } else if (estadoGeneral) {
    config = ESTADO_GENERAL_CONFIG[estadoGeneral];
  }

  const variantClass = variant
    ? {
        emerald: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
        sky: 'bg-sky-500/10 text-sky-800 border-sky-500/20',
        rose: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
        zinc: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20',
      }[variant]
    : undefined;

  const resolved = {
    label: label ?? config?.label ?? estadoRegistro ?? estadoGeneral ?? 'Desconocido',
    className: variantClass ?? config?.className ?? 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    dot: config?.dot ?? 'bg-slate-500',
    icon: config?.icon,
    iconFill: config?.iconFill,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
        resolved.className,
        className,
      )}
    >
      {showIcon && resolved.icon ? (
        <Icon
          name={resolved.icon}
          fill={resolved.iconFill}
          size="14px"
          className="shrink-0"
        />
      ) : (
        <span className={cn('w-2 h-2 rounded-full shrink-0', resolved.dot)} />
      )}
      <span>{resolved.label}</span>
    </span>
  );
}
