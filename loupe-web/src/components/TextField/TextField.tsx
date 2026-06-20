import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./TextField.module.scss";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Error message shown below the field (also sets aria-invalid). */
  error?: string;
  /** Optional leading icon inside the field. */
  icon?: ReactNode;
}

/** Labelled text input with error state — the form primitive for auth screens. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, icon, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <div className={cx(styles.inputWrap, error && styles.invalid)}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <span id={`${fieldId}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
});
