"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={Copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast({ message: "Copied" });
        } catch {
          toast({ message: "Couldn't copy. Select the text and copy it instead." });
        }
      }}
    >
      {label}
    </Button>
  );
}
