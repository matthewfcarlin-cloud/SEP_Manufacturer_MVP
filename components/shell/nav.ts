// The app shell's navigation. Pure, so the sidebar, the phone tab bar and the
// "More" sheet agree, and it can be tested without a browser.

export type NavIcon = "home" | "products" | "chat" | "shops" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/studio", label: "Home", icon: "home" },
  { href: "/projects", label: "My products", icon: "products" },
  { href: "/ask", label: "Ask Moko", icon: "chat" },
  { href: "/shops", label: "Manufacturers", icon: "shops" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** The phone's bottom tabs; a fourth "More" tab opens the rest. */
export const PHONE_TABS: readonly NavItem[] = [
  { href: "/studio", label: "Home", icon: "home" },
  { href: "/projects", label: "Products", icon: "products" },
  { href: "/ask", label: "Ask", icon: "chat" },
];

/** A product the sidebar lists under "Recent", with a small render when there is one. */
export type RecentProduct = { id: string; name: string; isExample: boolean; thumb?: string };

/** Whether a nav item is the current section. Product pages belong to My products. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/projects") return pathname.startsWith("/projects") || pathname.startsWith("/project/");
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The phone's More tab is current on any page its tabs don't cover. */
export function isMoreActive(pathname: string): boolean {
  return !PHONE_TABS.some((tab) => isActive(tab, pathname));
}
