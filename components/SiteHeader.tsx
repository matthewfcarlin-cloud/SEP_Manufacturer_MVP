import Link from "next/link";
import { Logo } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { HeaderAiPill } from "./HeaderAiPill";

const NAV = [
  { href: "/studio", label: "My products" },
  { href: "/shops", label: "Manufacturers" },
];

/** The public pages' header: light, logo left, the main links and one primary action. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-2 page-pad sm:gap-3">
        <Link href="/" className="min-w-0 shrink-0 rounded-control">
          <Logo priority className="h-5 w-auto sm:h-6" />
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <HeaderAiPill />
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hidden h-9 items-center whitespace-nowrap rounded-control px-3 text-[15px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink sm:flex">
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/new" size="sm" className="ml-1">
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start your product</span>
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
