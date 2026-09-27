import Link from "next/link";

const LINKS = [
  { href: "/new", label: "Start a project" },
  { href: "/studio", label: "Studio" },
  { href: "/shops", label: "Shops" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-night text-night-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-8 pt-16 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <p className="max-w-md text-night-muted">
            Design around the machines that are already running. Moko turns a CAD file into
            manufacturing paths, idle-capacity shop matches, and a pitch kit.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="eyebrow text-night-muted hover:text-night-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p aria-hidden className="display-type select-none text-[22vw] leading-[0.8] text-night-line md:text-[18vw]">
          Moko
        </p>
        <p className="eyebrow text-night-muted">
          Club MVP · Private by default · Costs are AI estimates · Every shop listed is fictional demo data
        </p>
      </div>
    </footer>
  );
}
