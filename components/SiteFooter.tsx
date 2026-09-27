import Link from "next/link";

const LINKS = [
  { href: "/new", label: "Start a project" },
  { href: "/studio", label: "My products" },
  { href: "/shops", label: "Manufacturers" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-night text-night-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-8 pt-16 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <p className="max-w-md text-night-muted">
            Moko helps you find the manufacturers who can make your product, local shops and overseas
            suppliers, writes the request for you, and lets you compare quotes, order and sell.
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
