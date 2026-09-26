/** Reference densities (g/cm³) for weight estimates in the UI and the AI brief. */
export const REFERENCE_DENSITIES: readonly { name: string; gPerCm3: number }[] = [
  { name: "ABS", gPerCm3: 1.04 },
  { name: "nylon PA12", gPerCm3: 1.01 },
  { name: "aluminum 6061", gPerCm3: 2.7 },
  { name: "steel", gPerCm3: 7.85 },
];

export function estimateMassGrams(volumeCm3: number, gPerCm3: number): number {
  return Math.round(volumeCm3 * gPerCm3);
}
