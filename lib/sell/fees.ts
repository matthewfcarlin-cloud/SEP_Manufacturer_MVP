// Etsy's standard US seller fees (approximate; check Etsy's current fee page):
// $0.20 listing fee, 6.5% transaction fee, and 3% + $0.25 payment processing.
// Shipping, offsite ads and currency conversion aren't included.

export const ETSY_LISTING_FEE_USD = 0.2;
export const ETSY_TRANSACTION_RATE = 0.065;
export const ETSY_PAYMENT_RATE = 0.03;
export const ETSY_PAYMENT_FIXED_USD = 0.25;

type Range = { low: number; high: number };

export type SaleEconomics = { feesUsd: number; afterFeesUsd: number; profitUsd?: Range };

/** What one Etsy sale leaves after fees, and after the estimated unit cost if known. */
export function etsySale(priceUsd: number, unitCostUsd?: Range): SaleEconomics {
  const fees = ETSY_LISTING_FEE_USD + priceUsd * (ETSY_TRANSACTION_RATE + ETSY_PAYMENT_RATE) + ETSY_PAYMENT_FIXED_USD;
  const feesUsd = Math.round(fees * 100) / 100;
  const afterFeesUsd = Math.round((priceUsd - fees) * 100) / 100;
  return {
    feesUsd,
    afterFeesUsd,
    ...(unitCostUsd && { profitUsd: { low: Math.round((afterFeesUsd - unitCostUsd.high) * 100) / 100, high: Math.round((afterFeesUsd - unitCostUsd.low) * 100) / 100 } }),
  };
}
