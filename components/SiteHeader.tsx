import Image from "next/image";
import Link from "next/link";
import logo from "@/public/brand/moko-logo-night.png";
import { HeaderAiPill } from "./HeaderAiPill";

const NAV = [
  { href: "/studio", label: "My products" },
  { href: "/shops", label: "Manufacturers" },
];

// Always dark (like the hero) so every page gets the same industrial frame.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-night-line bg-night/90 text-night-ink backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="min-w-0 shrink-0">
            <Image src={logo} alt="Moko" priority className="h-5 w-auto sm:h-6" />
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <HeaderAiPill />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="eyebrow whitespace-nowrap rounded-md px-1.5 py-2 text-night-muted hover:text-night-ink sm:px-3"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/new"
            aria-label="Start a project"
            className="eyebrow ml-1 whitespace-nowrap rounded-md bg-night-ink px-2.5 py-2 sm:px-3 text-night hover:bg-white"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start a project</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
