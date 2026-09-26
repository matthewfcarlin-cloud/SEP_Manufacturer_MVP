import { createHash, randomBytes } from "node:crypto";
import type { Project } from "./types";

// Projects belong to the browser that created them. Every browser gets a
// random owner key in an httpOnly cookie (set by proxy.ts); a project stores
// only the SHA-256 of it. There are no accounts: clearing cookies loses access.

export const OWNER_COOKIE = "idlefit_owner";
export const OWNER_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 400; // browsers cap cookies at ~400 days
const OWNER_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function newOwnerKey(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidOwnerKey(key: string | undefined): key is string {
  return typeof key === "string" && OWNER_KEY_PATTERN.test(key);
}

export function hashOwnerKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * - owner: this browser created it
 * - example: a shared demo, open to all
 * - claimable: made before ownership existed; the first browser to open it takes it
 * - none: someone else's (callers answer 404, so its existence isn't revealed)
 */
export type Access = "owner" | "example" | "claimable" | "none";

export function accessFor(project: Project, ownerKey: string | undefined): Access {
  if (project.isExample) return "example";
  if (!isValidOwnerKey(ownerKey)) return "none";
  if (!project.owner) return "claimable";
  return project.owner.keyHash === hashOwnerKey(ownerKey) ? "owner" : "none";
}
