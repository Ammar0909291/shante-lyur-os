import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, leftAddon, rightAddon, id, ...props },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 flex items-center text-text-tertiary pointer-events-none">
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-lg px-4 text-sm',
              'bg-charcoal border border-border-luxury',
              'text-text-primary placeholder:text-text-tertiary',
              'transition-all duration-200',
              'focus:outline-none focus:border-champagne focus:shadow-[0_0_0_3px_rgba(212,175,122,0.12)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error && 'border-red-500/60 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(196,120,120,0.15)]',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightAddon && (
            <span className="absolute right-3 flex items-center text-text-tertiary">
              {rightAddon}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400 flex items-center gap-1">
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
