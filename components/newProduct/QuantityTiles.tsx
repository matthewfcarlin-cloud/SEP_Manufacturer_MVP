"use client";

import { Box, Boxes, Factory, HelpCircle, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cx } from "@/components/ui/classes";
import { Input } from "@/components/ui/Field";
import { UNSURE_QUANTITY, type Quantity } from "@/lib/newProduct/flow";

type Tile = { quantity: Exclude<Quantity, null | { kind: "exact" }>; title: string; detail: string; icon: LucideIcon };

const TILES: readonly Tile[] = [
  { quantity: { kind: "preset", value: 10 }, title: "Just a few", detail: "10", icon: Box },
  { quantity: { kind: "preset", value: 100 }, title: "A small batch", detail: "100", icon: Boxes },
  { quantity: { kind: "preset", value: 1000 }, title: "A real run", detail: "1,000", icon: Factory },
  { quantity: { kind: "unsure" }, title: "Not sure yet", detail: `We'll plan for ${UNSURE_QUANTITY}`, icon: HelpCircle },
];

const same = (a: Quantity, b: Quantity) => JSON.stringify(a) === JSON.stringify(b);

/** Four 120px tiles in a 2×2 grid, plus an exact number for anyone who knows it. */
export function QuantityTiles({ value, onChange }: { value: Quantity; onChange: (q: Quantity) => void }) {
  const [isExactOpen, setIsExactOpen] = useState(value?.kind === "exact");
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="How many" className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => {
          const isSelected = same(value, tile.quantity);
          const Icon = tile.icon;
          return (
            <button
              key={tile.title}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setIsExactOpen(false);
                onChange(tile.quantity);
              }}
              className={cx(
                "flex h-[120px] flex-col items-start justify-between rounded-card border-2 p-4 text-left transition-colors",
                isSelected ? "border-accent bg-accent-soft" : "border-transparent bg-surface shadow-card hover:border-border-strong",
              )}
            >
              <Icon aria-hidden size={22} strokeWidth={1.75} className={isSelected ? "text-accent-ink" : "text-ink-2"} />
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold text-ink">{tile.title}</span>
                <span className={cx("text-[14px]", tile.quantity.kind === "preset" ? "font-mono text-ink-2" : "text-ink-2")}>{tile.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
      {isExactOpen ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Exact number</span>
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={value?.kind === "exact" ? value.value : ""}
            onChange={(e) => onChange({ kind: "exact", value: e.target.value })}
            placeholder="250"
            className="max-w-48 font-mono"
          />
        </label>
      ) : (
        <button type="button" onClick={() => setIsExactOpen(true)} className="self-start text-[14px] font-semibold text-accent-ink hover:underline">
          Know the exact number? Type it in
        </button>
      )}
    </div>
  );
}
