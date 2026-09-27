import type { NavIcon as Icon } from "./nav";

// Square-cornered line icons to match the sharp, industrial style.
const PATHS: Record<Icon | "chat" | "collapse" | "menu" | "close", string> = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  products: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  chat: "M3 4h18v12H8l-5 4z",
  shops: "M3 21V9l6-4v4l6-4v4l6-4v16z",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  collapse: "M15 5l-7 7 7 7",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M5 5l14 14M19 5 5 19",
};

export function NavIcon({ name, className = "h-4 w-4" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" className={`shrink-0 ${className}`}>
      <path d={PATHS[name]} />
    </svg>
  );
}
