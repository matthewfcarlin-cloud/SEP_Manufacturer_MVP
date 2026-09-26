"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
    >
      Print or save as PDF
    </button>
  );
}
