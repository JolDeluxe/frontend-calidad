import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  multiline?: boolean;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, multiline, helperText, textareaProps, ...props }, ref) => {
    const baseStyles =
      'w-full border rounded-md px-3.5 py-2.5 text-sm transition-all bg-app-surface text-text-primary placeholder:text-text-muted font-lectura ' +
      'focus:outline-none disabled:bg-app-surface-muted disabled:text-text-muted disabled:cursor-not-allowed shadow-2xs';
    const stateStyles = error
      ? 'border-danger focus:ring-2 focus:ring-danger/25 focus:border-danger'
      : 'border-border focus:ring-2 focus:ring-border-focus/25 focus:border-border-focus';

    if (multiline) {
      return (
        <div className="w-full">
          <textarea
            className={cn(baseStyles, stateStyles, 'resize-none h-24', className)}
            {...textareaProps}
          />
          {helperText && (
            <p className={cn('text-xs mt-1.5 font-lectura', error ? 'text-danger font-medium' : 'text-text-secondary')}>
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(baseStyles, stateStyles, className)}
          {...props}
        />
        {helperText && (
          <p className={cn('text-xs mt-1.5 font-lectura', error ? 'text-danger font-medium' : 'text-text-secondary')}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
