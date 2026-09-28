import type { ReactNode } from "react";

type Props = {
  /** A short plain line of context above the title (never a numbered or repeated label). */
  meta?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/** The shared page title block: an h1 in sentence case, one line of description, optional actions. */
export function PageHeader({ meta, title, description, actions }: Props) {
  return (
    <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="flex min-w-0 flex-col gap-2">
        {meta && <div className="type-small flex flex-wrap items-center gap-2 text-muted">{meta}</div>}
        <h1 className="type-h1 break-words">{title}</h1>
        {description && <div className="max-w-2xl text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
