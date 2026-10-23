export type EstadoRegistro = 'ACTIVO' | 'INACTIVO';
export type EstadoGeneral = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';

export interface StatusVisualConfig {
  label: string;
  className: string;
  dot: string;
  icon?: string;
  iconFill?: boolean;
}

export const ESTADO_REGISTRO_CONFIG: Record<EstadoRegistro, StatusVisualConfig> = {
  ACTIVO: {
    label: 'Activo',
    className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: 'check_circle',
    iconFill: true,
  },
  INACTIVO: {
    label: 'Inactivo',
    className: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    dot: 'bg-rose-500',
    icon: 'cancel',
    iconFill: true,
  },
};

export const ESTADO_GENERAL_CONFIG: Record<EstadoGeneral, StatusVisualConfig> = {
  PENDIENTE: {
    label: 'Pendiente',
    className: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    dot: 'bg-amber-500',
    icon: 'hourglass_empty',
  },
  EN_PROCESO: {
    label: 'En Proceso',
    className: 'bg-sky-500/10 text-sky-800 border-sky-500/20',
    dot: 'bg-sky-500',
    icon: 'sync',
  },
  COMPLETADO: {
    label: 'Completado',
    className: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: 'check',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20',
    dot: 'bg-zinc-400',
    icon: 'close',
  },
};
