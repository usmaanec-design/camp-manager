import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-neutral-700 tracking-wide">
            {label}
            {props.required && <span className="text-orange-600 ms-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 pointer-events-none text-neutral-400 flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-md border text-sm transition-colors placeholder:text-neutral-400 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-neutral-100 disabled:text-neutral-500 ${
              error
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-neutral-300 focus:border-orange-500'
            } ${leftIcon ? 'ps-9' : 'ps-3'} ${rightIcon ? 'pe-9' : 'pe-3'} py-1.5 h-9 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3 pointer-events-none text-neutral-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-neutral-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
