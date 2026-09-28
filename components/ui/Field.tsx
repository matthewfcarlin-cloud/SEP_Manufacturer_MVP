import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "./classes";

// Inputs (§3): 44px, radius 10, surface, 1px border; focus is an accent border plus a soft ring.
const CONTROL =
  "rounded-control border border-control-border bg-surface px-3.5 text-[15px] text-ink transition-[border-color,box-shadow] placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-red";

// Full width unless the caller sets a width (two width utilities would fight).
const width = (className?: string) => (/(^|\s)w-/.test(className ?? "") ? "" : "w-full");

export const inputClasses = (className?: string) => cx(CONTROL, width(className), "h-11", className);

/** For any control (input, textarea, select) whose height follows its content: at least 44px. */
export const controlClasses = (className?: string) => cx(CONTROL, width(className), "min-h-11 py-2.5", className);

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={inputClasses(className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(CONTROL, width(className), "min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(CONTROL, width(className), "h-11 pr-8", className)} {...rest} />;
}

type FieldProps = {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Render the control with the ids the label and helper point at. */
  children: (ids: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
};

/** A label above (14px 500), the control, and helper or error text below (13px). */
export function Field({ label, helper, error, className, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? helper;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[14px] font-medium text-ink">
        {label}
      </label>
      {children({ id, "aria-describedby": note ? noteId : undefined, "aria-invalid": error ? true : undefined })}
      {note && (
        <p id={noteId} className={cx("type-small", error ? "text-red-ink" : "text-muted")}>
          {note}
        </p>
      )}
    </div>
  );
}
