import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToasts, toastStore, type ToastItem, type ToastType } from './toast-store';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'cancel',
  warning: 'warning',
  info: 'info',
};

const TOAST_STYLES: Record<ToastType, {
  iconBg: string;
  iconColor: string;
  progress: string;
  glow: string;
}> = {
  success: {
    iconBg: 'bg-emerald-500/10 ring-1 ring-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    progress: 'bg-emerald-500',
    glow: 'hover:border-emerald-500/30',
  },
  error: {
    iconBg: 'bg-rose-500/10 ring-1 ring-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    progress: 'bg-rose-500',
    glow: 'hover:border-rose-500/30',
  },
  warning: {
    iconBg: 'bg-amber-500/10 ring-1 ring-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    progress: 'bg-amber-500',
    glow: 'hover:border-amber-500/30',
  },
  info: {
    iconBg: 'bg-blue-500/10 ring-1 ring-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    progress: 'bg-blue-500',
    glow: 'hover:border-blue-500/30',
  },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const style = TOAST_STYLES[item.type];
  const duration = item.duration ?? 4000;

  // Dispara la animación de entrada al montar
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Controla el cierre automático y la pausa con el mouse
  useEffect(() => {
    if (duration <= 0 || paused) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, paused]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => toastStore.remove(item.id), 300); // Espera a que termine la animación
  };

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        'group relative overflow-hidden pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl',
        'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
        'border border-slate-200/80 dark:border-slate-800/80',
        'shadow-lg shadow-slate-900/5 dark:shadow-black/30',
        'transition-all duration-300 ease-out',
        style.glow,
        visible
          ? 'translate-y-0 translate-x-0 opacity-100 scale-100'
          : 'translate-y-3 sm:translate-y-0 sm:translate-x-6 opacity-0 scale-95'
      )}
    >
      {/* Ícono con anillo suave */}
      <div className={cn('shrink-0 p-2 rounded-xl flex items-center justify-center', style.iconBg)}>
        <Icon name={TOAST_ICONS[item.type]} size="20px" className={style.iconColor} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pt-0.5">
        {item.title && (
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight mb-1">
            {item.title}
          </h4>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {item.message}
        </p>
      </div>

      {/* Botón cerrar (aparece más claro al pasar el mouse) */}
      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 opacity-60 group-hover:opacity-100 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        title="Cerrar"
      >
        <Icon name="close" size="14px" />
      </button>

      {/* Barra de progreso inferior */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/50">
          <div
            className={cn('h-full transition-all ease-linear', style.progress)}
            style={{
              width: visible && !paused ? '0%' : '100%',
              transitionDuration: visible && !paused ? `${duration}ms` : '150ms',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToasts();

  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none sm:bottom-6 sm:right-6"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    document.body
  );
}