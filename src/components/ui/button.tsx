import { cn } from '@/lib/utils/cn';
import { Icon } from './icon';

/** Variantes semánticas del botón del Design System. */
const variants = {
  /** Acción afirmativa principal o de avance (Guardar, Aceptar, Iniciar Sesión, Continuar) */
  primary:   'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs',
  /** Botón Guardar / Aceptar creación afirmativa con color éxito institucional */
  guardar:   'bg-estado-resuelto hover:bg-success-hover text-white shadow-xs',
  /** Acción de soporte o acento secundario (Sincronizar, Filtros) */
  secondary: 'bg-brand-accent hover:bg-brand-accent-hover text-white shadow-xs',
  /** Botón de acción azul */
  accion:    'bg-estado-asignada hover:brightness-110 text-white shadow-xs',
  /** Confirmación explícita o validación positiva (Confirmar entrega, Validar, Aprobar) */
  success:   'bg-success hover:bg-success-hover text-white shadow-xs',
  /** Advertencia o precaución (Retroceder, Suspender) */
  warning:   'bg-warning hover:bg-warning-hover text-white shadow-xs',
  /** Acción destructiva o revocación (Eliminar, Desactivar usuario, Cancelar pedido) */
  danger:    'bg-danger hover:bg-danger-hover text-white shadow-xs',
  /** Acción neutra de descarte sin persistencia (Cancelar modal, Cerrar diálogo, Regresar) */
  neutral:   'bg-app-surface-muted hover:bg-border text-text-primary border border-border/80 shadow-xs',
  cancelar:  'bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-xs',
  /** Borde limpio con fondo transparente */
  outline:   'bg-transparent border border-border text-text-primary hover:bg-app-surface-muted',
  /** Sin borde ni fondo hasta interacción (Cerrar modal, iconos de fila) */
  ghost:     'bg-transparent text-text-secondary hover:bg-app-surface-muted hover:text-text-primary',
  /** Icon button */
  icon:      'bg-white text-slate-700 border border-slate-200 hover:border-marca-secundario/40 hover:bg-marca-primario/5 shadow-sm',
} as const;

export type ButtonVariant = keyof typeof variants;

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  icon: 'h-10 w-10 p-0',
} as const;

export type ButtonSize = keyof typeof sizes;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Nombre de icono Material Symbols (opcional) */
  icon?: string;
  iconSize?: string;
  isLoading?: boolean;
}

/**
 * Componente Button del Design System.
 * Centraliza variantes semánticas, estados interactivos, focus-visible accesible y geometría unificada.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconSize,
  isLoading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClass =
    'rounded-md font-interfaz font-semibold inline-flex items-center justify-center gap-2 ' +
    'transition-all duration-200 ease-out select-none cursor-pointer ' +
    'active:scale-[0.98] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';

  const variantClass = variants[variant] ?? variants.primary;
  const sizeClass    = sizes[size] ?? sizes.md;
  const resolvedIconSize = iconSize ?? size;
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(baseClass, variantClass, sizeClass, className)}
      {...props}
    >
      {isLoading ? (
        <Icon name="progress_activity" className="animate-spin text-current" size={resolvedIconSize} opsz={20} weight={500} />
      ) : icon ? (
        <Icon name={icon} size={resolvedIconSize} opsz={20} weight={500} />
      ) : null}
      {children}
    </button>
  );
}
