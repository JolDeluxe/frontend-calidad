import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, helperText, children, ...props }, ref) => {
    const baseStyles =
      'w-full border rounded-md px-3.5 py-2.5 text-sm transition-all bg-app-surface text-text-primary font-lectura ' +
      'focus:outline-none disabled:bg-app-surface-muted disabled:text-text-muted disabled:cursor-not-allowed shadow-2xs appearance-none';
    const stateStyles = error
      ? 'border-danger focus:ring-2 focus:ring-danger/25 focus:border-danger'
      : 'border-border focus:ring-2 focus:ring-border-focus/25 focus:border-border-focus';

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(baseStyles, stateStyles, 'pr-9 cursor-pointer', className)}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {helperText && (
          <p className={cn('text-xs mt-1.5 font-lectura', error ? 'text-danger font-medium' : 'text-text-secondary')}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
