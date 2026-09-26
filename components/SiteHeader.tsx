import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-accent-ink">
            If
          </span>
          Idlefit
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/projects" className="rounded-md px-3 py-2 text-muted hover:text-ink">
            Projects
          </Link>
          <Link href="/shops" className="rounded-md px-3 py-2 text-muted hover:text-ink">
            Shops
          </Link>
          <Link
            href="/new"
            className="rounded-md bg-ink px-3 py-2 font-medium text-bg hover:opacity-90"
          >
            Start a project
          </Link>
        </nav>
      </div>
    </header>
  );
}
