// The app shell's navigation and page titles. Pure, so the sidebar, the
// phone menu and the top bar agree, and it can be tested without a browser.

export type NavIcon = "home" | "products" | "shops" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/studio", label: "My products", icon: "products" },
  { href: "/shops", label: "Manufacturers", icon: "shops" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** A product the sidebar lists under "Recent". */
export type RecentProduct = { id: string; name: string; isExample: boolean };

/** Whether a nav item is the current section. Product pages belong to My products. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.href === "/studio") return pathname.startsWith("/studio") || pathname.startsWith("/project/") || pathname === "/new";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const PRODUCT_TABS: Record<string, string> = { make: "Make", plan: "Plan", pitch: "Pitch", sell: "Sell", compare: "Compare", versions: "New version" };

/** The top bar's title for a path. Product pages show the product's name when it's known. */
export function titleFor(pathname: string, productNames: Readonly<Record<string, string>>): string {
  const product = pathname.match(/^\/project\/([^/]+)(?:\/([^/]+))?/);
  if (product) {
    const name = productNames[product[1]] ?? "Product";
    const tab = product[2] && PRODUCT_TABS[product[2]];
    return tab ? `${name} · ${tab}` : name;
  }
  if (pathname === "/new") return "New product";
  const item = NAV_ITEMS.find((i) => i.href !== "/" && isActive(i, pathname));
  return item?.label ?? "Moko";
}
