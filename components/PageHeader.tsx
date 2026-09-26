import type { ReactNode } from "react";

type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/** The shared page title block: mono eyebrow, big uppercase display title, optional actions. */
export function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <header className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
      <div className="flex min-w-0 flex-col gap-4">
        {eyebrow && <div className="eyebrow flex flex-wrap items-center gap-3 text-muted">{eyebrow}</div>}
        <h1 className="display-type break-words text-[clamp(2.4rem,6vw,5rem)]">{title}</h1>
        {description && <div className="max-w-2xl text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
