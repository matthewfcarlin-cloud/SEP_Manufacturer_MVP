import Link from "next/link";
import { Logo } from "@/components/shell/Logo";

const LINKS = [
  { href: "/new", label: "Start a project" },
  { href: "/studio", label: "My products" },
  { href: "/shops", label: "Manufacturers" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="bg-sidebar">
      <div className="mx-auto flex max-w-content flex-col gap-8 page-pad pb-8 pt-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="flex max-w-md flex-col gap-4">
            <Logo className="h-5 w-auto self-start" />
            <p className="text-ink-2">
              Moko helps you find the manufacturers who can make your product, local shops and overseas
              suppliers, writes the request for you, and lets you compare quotes, order and sell.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[14px] font-medium text-ink-2 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="type-small text-muted">
          Club MVP · Private by default · Costs are AI estimates · Every shop listed is fictional demo data
        </p>
      </div>
    </footer>
  );
}
