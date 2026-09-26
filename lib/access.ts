import { cookies } from "next/headers";
import { fail } from "./api";
import { accessFor, hashOwnerKey, isValidOwnerKey, OWNER_COOKIE, type Access } from "./ownerKey";
import { getProject, updateProject } from "./projectStore";
import type { Project } from "./types";

// Server-only. Every page and API route that reads or changes a project goes
// through getAccessibleProject(); anything that fails the check is reported
// as "not found", so another browser can't even tell the project exists.

export async function currentOwnerKey(): Promise<string | undefined> {
  const key = (await cookies()).get(OWNER_COOKIE)?.value;
  return isValidOwnerKey(key) ? key : undefined;
}

export type AccessibleProject = { project: Project; access: Exclude<Access, "claimable" | "none"> };

/** The project if this browser may use it, else null. Claims pre-ownership projects for the first browser that opens them. */
export async function getAccessibleProject(id: string): Promise<AccessibleProject | null> {
  const project = await getProject(id);
  if (!project) return null;
  const key = await currentOwnerKey();
  const access = accessFor(project, key);
  if (access === "none") return null;
  if (access === "claimable" && key) {
    const claimed = await updateProject(id, (p) => (p.owner ? p : { ...p, owner: { keyHash: hashOwnerKey(key) } }));
    if (!claimed || accessFor(claimed, key) !== "owner") return null;
    console.info(`[access] project ${id} predates ownership; claimed by the first browser to open it`);
    return { project: claimed, access: "owner" };
  }
  return { project, access: access as AccessibleProject["access"] };
}

/** The owner hash to stamp on a project this browser creates. */
export async function currentOwnerHash(): Promise<string | undefined> {
  const key = await currentOwnerKey();
  return key ? hashOwnerKey(key) : undefined;
}

/**
 * For owner-only actions (delete, share, privacy settings): the project, or
 * the response to return. Examples are shared demos, so nobody owns them.
 */
export async function requireOwner(id: string): Promise<Project | Response> {
  const found = await getAccessibleProject(id);
  if (!found) return fail("Project not found.", 404);
  if (found.access !== "owner") return fail("Example projects are shared demos: they can't be deleted or shared.", 403);
  return found.project;
}
