import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export type InputVariant = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  icon?: ReactNode;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  variant?: Exclude<InputVariant, 'textarea' | 'select'>;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  variant: 'textarea';
  rows?: number;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
  variant: 'select';
  options?: Array<{ value: string; label: string }>;
}

type AllInputProps = InputProps | TextareaProps | SelectProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, AllInputProps>(
  (props, ref) => {
    const {
      label,
      error,
      helperText,
      required,
      icon,
      className = '',
      disabled,
      ...restProps
    } = props;

    const variant = props.variant || 'text';

    const baseInputStyles = 'block w-full px-4 py-2 border rounded-lg text-sm text-forvis-gray-900 placeholder:text-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    const errorBorderStyles = error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-forvis-gray-300';

    const inputClassName = `${baseInputStyles} ${errorBorderStyles} ${className}`.trim();

    const labelElement = label && (
      <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );

    const errorElement = error && (
      <p className="mt-1 text-xs text-red-600">{error}</p>
    );

    const helperTextElement = helperText && !error && (
      <p className="mt-1 text-xs text-forvis-gray-500">{helperText}</p>
    );

    if (variant === 'textarea') {
      const { rows = 4, ...textareaProps } = restProps as TextareaProps;
      return (
        <div>
          {labelElement}
          <textarea
            ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
            rows={rows}
            className={inputClassName}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${textareaProps.id}-error` : undefined}
            {...textareaProps}
          />
          {errorElement}
          {helperTextElement}
        </div>
      );
    }

    if (variant === 'select') {
      const { options = [], ...selectProps } = restProps as SelectProps;
      return (
        <div>
          {labelElement}
          <select
            ref={ref as React.ForwardedRef<HTMLSelectElement>}
            className={inputClassName}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectProps.id}-error` : undefined}
            {...selectProps}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errorElement}
          {helperTextElement}
        </div>
      );
    }

    // Default: text, email, password, number
    const inputProps = restProps as InputProps;
    const inputType = variant === 'text' ? undefined : variant;

    return (
      <div>
        {labelElement}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-forvis-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref as React.ForwardedRef<HTMLInputElement>}
            type={inputType}
            className={`${inputClassName} ${icon ? 'pl-10' : ''}`}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputProps.id}-error` : undefined}
            {...inputProps}
          />
        </div>
        {errorElement}
        {helperTextElement}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };


























