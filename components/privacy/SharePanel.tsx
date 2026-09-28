"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import type { ShareLink } from "@/lib/types";
import { controlClasses } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/classes";

const noSubscribe = () => () => {};

const buttonClass = buttonClasses({ variant: "secondary", size: "sm" });

/** Owner controls for the public pitch link: off by default, can be turned off or revoked any time. */
export function SharePanel({ projectId, share }: { projectId: string; share?: ShareLink }) {
  const router = useRouter();
  // The link needs this site's origin, which only the browser knows; "" while server-rendering.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const call = async (url: string, method: "PUT" | "POST", body?: object) => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const json = (await res.json()) as ApiResponse<ShareLink>;
      if (!json.success) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  };

  const isOn = Boolean(share?.enabled);
  const link = share && origin ? `${origin}/p/${share.token}` : "";

  return (
    <section id="share" aria-label="Share link" className="flex scroll-mt-20 flex-col gap-3 card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Public link {isOn ? "on" : "off"}</p>
          <p className="text-[13px] text-ink-2">
            Private by default. Anyone with the link sees this pitch (text, renders, estimates), never your CAD file, photos or notes.
          </p>
        </div>
        <button type="button" disabled={isBusy} onClick={() => call(`/api/projects/${projectId}/share`, "PUT", { enabled: !isOn })} className={buttonClass}>
          {isOn ? "Turn off link" : "Create share link"}
        </button>
      </div>
      {isOn && link && (
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={link} aria-label="Share link" className={controlClasses("min-w-0 flex-1 bg-bg text-[13px]")} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className={buttonClass}
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            className={buttonClass}
            onClick={() => {
              if (window.confirm("Revoke this link? Anyone using it loses access, and you get a new link.")) {
                void call(`/api/projects/${projectId}/share/rotate`, "POST");
              }
            }}
          >
            Revoke and make a new link
          </button>
        </div>
      )}
      <FormError message={error} />
    </section>
  );
}
