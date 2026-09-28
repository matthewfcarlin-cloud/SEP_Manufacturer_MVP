"use client";

import { Copy, FilePlus2, GitCompare, Share2, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse } from "@/lib/api";

type Props = { projectId: string; productName: string; isExample: boolean; versionCount: number; latestVersion: number; canSharePitch: boolean };

/** The ⋯ menu beside the product's name: new version, compare, copy, share and delete. */
export function ProductMenu({ projectId, productName, isExample, versionCount, latestVersion, canSharePitch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const base = `/project/${projectId}`;

  const duplicate = async () => {
    setIsCopying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ id: string }> | null;
      if (!json?.success) throw new Error(json?.error ?? "Couldn't make a copy. Please try again.");
      toast({ message: "Copy made", icon: Copy });
      router.push(`/project/${json.data.id}`);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't make a copy. Please try again." });
    } finally {
      setIsCopying(false);
    }
  };

  // The delete controls live on the Idea screen; opening them there needs a real hash change.
  const openDelete = () => {
    if (pathname === `${base}/idea`) window.location.hash = "danger-zone";
    else router.push(`${base}/idea#danger-zone`);
  };

  const items: MenuItem[] = [
    { label: "New version", icon: FilePlus2, onSelect: () => router.push(`${base}/versions/new?from=${latestVersion}`) },
    ...(versionCount > 1 ? [{ label: "Compare versions", icon: GitCompare, onSelect: () => router.push(`${base}/compare`) }] : []),
    { label: isExample ? "Make my own copy" : "Duplicate", icon: Copy, isDisabled: isCopying, onSelect: () => void duplicate() },
    ...(isExample ? [] : [{ label: "Share pitch", icon: Share2, isDisabled: !canSharePitch, onSelect: () => router.push(`${base}/pitch#share`) }]),
    ...(isExample ? [] : [{ label: "Delete…", icon: Trash2, isDanger: true, onSelect: openDelete }]),
  ];
  return <Menu label={`More actions for ${productName}`} items={items} />;
}
