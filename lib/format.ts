import type { GeometryStats } from "./types";

const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatDimensions({ x, y, z }: GeometryStats["boundingBoxMm"]): string {
  return `${oneDecimal.format(x)} × ${oneDecimal.format(y)} × ${oneDecimal.format(z)} mm`;
}

export function formatNumber(n: number, decimals = 1): string {
  return decimals === 0 ? integer.format(n) : oneDecimal.format(n);
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Range = { low: number; high: number };

const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "$18.33–$26.50" for per-unit costs; whole dollars at $100+ where cents are noise. */
export function formatUnitCostRange({ low, high }: Range): string {
  const fmt = high >= 100 ? usdWhole : usdCents;
  return low === high ? fmt.format(low) : `${fmt.format(low)}–${fmt.format(high)}`;
}

/** "$150–$500", or "None" when there's no tooling. */
export function formatToolingRange({ low, high }: Range): string {
  if (high === 0) return "None";
  return low === high ? usdWhole.format(low) : `${usdWhole.format(low)}–${usdWhole.format(high)}`;
}

export function formatDaysRange({ low, high }: Range): string {
  return low === high ? `${low} days` : `${low}–${high} days`;
}
