import Image from "next/image";
import Link from "next/link";
import logo from "@/public/brand/moko-logo-night.png";
import { getShops, summarizeShops } from "@/lib/shops";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/shops", label: "Shops" },
];

// Always dark (like the hero) so every page gets the same industrial frame.
export function SiteHeader() {
  const { idleMachines } = summarizeShops(getShops());
  return (
    <header className="sticky top-0 z-40 border-b border-night-line bg-night/90 text-night-ink backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <Image src={logo} alt="Moko" priority className="h-6 w-auto" />
          </Link>
          <Link
            href="/shops"
            className="eyebrow hidden items-center gap-2 text-night-muted hover:text-night-ink md:flex"
            title="Demo shop data"
          >
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-night-idle opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-night-idle" />
            </span>
            {idleMachines} machines idle in LA
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="eyebrow whitespace-nowrap rounded-md px-2 py-2 text-night-muted hover:text-night-ink sm:px-3"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/new"
            aria-label="Start a project"
            className="eyebrow ml-1 whitespace-nowrap rounded-md bg-night-ink px-3 py-2 text-night hover:bg-white"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start a project</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
