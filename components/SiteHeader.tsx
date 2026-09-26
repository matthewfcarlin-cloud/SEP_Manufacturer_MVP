import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-accent-ink">
            If
          </span>
          Idlefit
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <Link href="/projects" className="whitespace-nowrap rounded-md px-2 py-2 text-muted hover:text-ink sm:px-3">
            Projects
          </Link>
          <Link href="/shops" className="whitespace-nowrap rounded-md px-2 py-2 text-muted hover:text-ink sm:px-3">
            Shops
          </Link>
          <Link
            href="/new"
            aria-label="Start a project"
            className="whitespace-nowrap rounded-md bg-ink px-2.5 py-2 font-medium text-bg hover:opacity-90 sm:px-3"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start a project</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
