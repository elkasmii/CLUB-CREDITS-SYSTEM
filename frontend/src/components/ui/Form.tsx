import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: (id: string) => ReactNode;
}

/** Label + control + error message, wired together for accessibility. */
export function Field({ label, error, hint, required, children }: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden> *</span>}
      </label>
      {children(id)}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode };

export function TextInput({ label, error, hint, required, ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id) => <input id={id} className="input" required={required} aria-invalid={!!error} {...rest} />}
    </Field>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode };

export function TextArea({ label, error, hint, required, ...rest }: TextAreaProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id) => <textarea id={id} className="input input--textarea" required={required} aria-invalid={!!error} {...rest} />}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode };

export function Select({ label, error, required, children, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} required={required}>
      {(id) => (
        <select id={id} className="input input--select" required={required} aria-invalid={!!error} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden>
        <span className="toggle__thumb" />
      </span>
      <span>
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {message}
    </div>
  );
}
