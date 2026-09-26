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
