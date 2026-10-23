import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'screen' | 'full';
}

export interface ModalHeaderProps {
  title?: string;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const MODAL_SIZES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  screen: 'max-w-[95vw] xl:max-w-[92vw] 2xl:max-w-[88vw] w-full',
  full: 'max-w-[98vw] w-full',
};

/**
 * Modal portal con Escape listener y bloqueo de scroll.
 * Renderiza en document.body para evitar problemas de z-index.
 */
export function Modal({ isOpen, onClose, children, className = '', size = '2xl' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = MODAL_SIZES[size] || 'max-w-2xl';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'bg-app-surface rounded-lg shadow-2xl relative flex flex-col max-h-[96vh] w-full border border-border/80 animate-in zoom-in-95 duration-200',
          sizeClass,
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ title, onClose, className = '', children }: ModalHeaderProps) {
  return (
    <div className={cn('shrink-0 p-6 pb-4 border-b border-border-subtle relative', className)}>
      {children ?? (
        <h2 className="text-xl font-bold text-brand-primary text-center uppercase tracking-wider fuente-titulos">
          {title}
        </h2>
      )}
      {onClose && (
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 p-0 rounded-full text-text-muted hover:text-text-primary"
          />
        </div>
      )}
    </div>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={cn('grow overflow-y-auto overflow-x-hidden p-6 font-lectura text-text-primary', className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={cn('shrink-0 flex justify-end gap-3 p-4 px-6 border-t border-border-subtle bg-app-surface-muted/60 rounded-b-lg', className)}>
      {children}
    </div>
  );
}
