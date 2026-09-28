"use client";

import Link from "next/link";
import { useAiUsage } from "@/components/shell/useAiUsage";

/** Ask Moko's footer: "Uses your demo budget · Add your key", or that your own key pays. */
export function AiUsageFooter() {
  const usage = useAiUsage();
  const link = "font-medium text-accent-ink hover:underline";
  return usage?.kind === "key" ? (
    <>
      Uses your own key ·{" "}
      <Link href="/settings" className={link}>
        Manage
      </Link>
    </>
  ) : (
    <>
      Uses your demo budget ·{" "}
      <Link href="/settings" className={link}>
        Add your key
      </Link>
    </>
  );
}
