import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  className?: string;
  error?: boolean;
  hint?: string;
}

export function Label({ children, className, error, hint, ...props }: LabelProps) {
  return (
    <div className="flex justify-between items-end mb-1">
      <label
        className={cn(
          'block text-sm font-bold font-interfaz select-none',
          error ? 'text-danger' : 'text-text-primary',
          className,
        )}
        {...props}
      >
        {children}
      </label>
      {hint && (
        <span
          className={cn(
            'text-xs font-lectura',
            error ? 'text-danger font-semibold' : 'text-text-secondary',
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
