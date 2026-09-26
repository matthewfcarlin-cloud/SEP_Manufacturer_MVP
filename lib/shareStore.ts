import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot, getProject, updateProject } from "./projectStore";
import { SHARE_TOKEN_PATTERN } from "./schemas";
import type { Project, ShareLink } from "./types";

// Public pitch links. A token is 128 random bits; .data/shares/<token>.json
// maps it back to its project so lookups don't scan every project. The
// project's own `share` field is the source of truth: a link works only while
// it is the project's current token and sharing is on.

const newShareToken = () => randomBytes(16).toString("base64url");
const indexPath = (token: string) => path.join(dataRoot(), "shares", `${token}.json`);

async function writeIndex(token: string, projectId: string): Promise<void> {
  await mkdir(path.join(dataRoot(), "shares"), { recursive: true });
  await writeFile(indexPath(token), JSON.stringify({ projectId }));
}

export async function removeShareIndex(token: string): Promise<void> {
  if (SHARE_TOKEN_PATTERN.test(token)) await rm(indexPath(token), { force: true });
}

/** Turns the public link on or off. Turning it back on restores the same link. */
export async function setSharing(projectId: string, enabled: boolean): Promise<ShareLink | null> {
  const project = await updateProject(projectId, async (p) => {
    const share = p.share ?? { token: newShareToken(), enabled, createdAt: new Date().toISOString() };
    if (!p.share) await writeIndex(share.token, p.id);
    return { ...p, share: { ...share, enabled } };
  });
  return project?.share ?? null;
}

/** Revokes the current link and issues a new one (sharing stays on). */
export async function rotateShare(projectId: string): Promise<ShareLink | null> {
  let old: string | undefined;
  const project = await updateProject(projectId, async (p) => {
    old = p.share?.token;
    const share = { token: newShareToken(), enabled: true, createdAt: new Date().toISOString() };
    await writeIndex(share.token, p.id);
    return { ...p, share };
  });
  if (old) await removeShareIndex(old);
  return project?.share ?? null;
}

/** The project a public link points at, or null if the link is malformed, revoked, or turned off. */
export async function resolveShare(token: string): Promise<Project | null> {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;
  let projectId: unknown;
  try {
    projectId = JSON.parse(await readFile(indexPath(token), "utf8")).projectId;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  if (typeof projectId !== "string") return null;
  const project = await getProject(projectId);
  return project?.share?.enabled && project.share.token === token ? project : null;
}
