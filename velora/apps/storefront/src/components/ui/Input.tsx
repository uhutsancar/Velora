import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

const FIELD_BASE =
  'w-full border-b bg-transparent px-0 py-3 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:text-ink-400';

interface FieldShellProps {
  id: string;
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, required, children }: FieldShellProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label-caps mb-1 block text-ink-500">
          {label}
          {required && <span className="ml-1 text-wine-500">*</span>}
        </label>
      )}

      {children}

      {/* aria-live so screen readers announce validation as it appears. */}
      <div aria-live="polite" className="min-h-[1.25rem]">
        {error ? (
          <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-wine-500">
            <AlertCircle aria-hidden className="h-3 w-3 shrink-0" />
            {error}
          </p>
        ) : (
          hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>
        )}
      </div>
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, id, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <div className="relative flex items-center">
        {leftIcon && <span className="pointer-events-none mr-2 text-ink-400">{leftIcon}</span>}

        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            FIELD_BASE,
            error ? 'border-wine-500 focus:border-wine-500' : 'border-ink-200 focus:border-ink-900',
            className,
          )}
          {...rest}
        />

        {rightSlot && <span className="ml-2 shrink-0">{rightSlot}</span>}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, required, rows = 4, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(
          FIELD_BASE,
          'resize-y',
          error ? 'border-wine-500 focus:border-wine-500' : 'border-ink-200 focus:border-ink-900',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className, id, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(
          FIELD_BASE,
          'appearance-none bg-[right_0.25rem_center] bg-no-repeat pr-6',
          error ? 'border-wine-500' : 'border-ink-200 focus:border-ink-900',
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%23847D72' stroke-width='1.5'/></svg>\")",
        }}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div>
      <label htmlFor={fieldId} className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          aria-invalid={Boolean(error)}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded-none border-ink-300 text-ink-900 accent-ink-900',
            'focus-visible:ring-2 focus-visible:ring-tan-500',
            className,
          )}
          {...rest}
        />
        <span className="leading-snug">{label}</span>
      </label>

      {error && <p className="mt-1 text-xs text-wine-500">{error}</p>}
    </div>
  );
});
