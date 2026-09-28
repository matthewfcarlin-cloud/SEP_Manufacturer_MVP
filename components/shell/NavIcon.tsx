import { Factory, House, LayoutGrid, Settings, Sparkles, type LucideIcon } from "lucide-react";
import type { NavIcon as Icon } from "./nav";

const ICONS: Record<Icon, LucideIcon> = { home: House, products: LayoutGrid, chat: Sparkles, shops: Factory, settings: Settings };

/** A nav item's icon: lucide, 18px, stroke 1.75. */
export function NavIcon({ name }: { name: Icon }) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />;
}
