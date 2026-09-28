// Class builders shared by the UI components, kept pure so they can be tested.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

/** Join class names, skipping falsy ones. */
export function cx(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-button text-white hover:bg-accent-button-hover",
  secondary: "border border-border bg-surface text-ink hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  /** Only for confirming a delete. */
  danger: "bg-red text-white hover:bg-red/90",
};

const SIZES: Record<ButtonSize, string> = {
  /** Only for the one big finishing action, like "Create my product". */
  lg: "h-[52px] px-6 text-[17px]",
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3.5 text-[14px]",
};

/** Buttons (§3): 44px (36px small, 52px for a big finishing action), radius 10, Geist 600. */
export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], className);
}

export type Tone = "green" | "amber" | "red" | "blue" | "accent" | "neutral";

/** Soft background + strong text of the same color, for pills, verdicts and icon circles. */
export const TONES: Record<Tone, { soft: string; text: string; dot: string }> = {
  green: { soft: "bg-green-soft", text: "text-green-ink", dot: "bg-green" },
  amber: { soft: "bg-amber-soft", text: "text-amber-ink", dot: "bg-amber" },
  red: { soft: "bg-red-soft", text: "text-red-ink", dot: "bg-red" },
  blue: { soft: "bg-blue-soft", text: "text-blue-ink", dot: "bg-blue" },
  accent: { soft: "bg-accent-soft", text: "text-accent-ink", dot: "bg-accent" },
  neutral: { soft: "bg-hover", text: "text-ink-2", dot: "bg-muted" },
};
