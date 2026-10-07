import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-neutral-700 tracking-wide">
            {label}
            {props.required && <span className="text-orange-600 ms-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`w-full rounded-md border text-sm transition-colors placeholder:text-neutral-400 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-neutral-100 disabled:text-neutral-500 ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-neutral-300 focus:border-orange-500'
          } p-2.5 ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-neutral-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
