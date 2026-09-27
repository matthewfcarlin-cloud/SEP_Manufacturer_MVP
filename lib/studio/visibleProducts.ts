import { currentOwnerKey } from "../access";
import { accessFor, type Access } from "../ownerKey";
import { listProjects, projectUpdatedAt } from "../projectStore";
import type { Project } from "../types";

export type VisibleProduct = { project: Project; access: Exclude<Access, "none">; updatedAt: string };

/** Every product this browser can open, newest change first: its own, then the shared examples. */
export async function visibleProducts(): Promise<VisibleProduct[]> {
  const ownerKey = await currentOwnerKey();
  const rows = await Promise.all(
    (await listProjects()).map(async (project) => {
      const access = accessFor(project, ownerKey);
      if (access === "none") return null;
      const updated = (await projectUpdatedAt(project.id)) ?? new Date(project.createdAt);
      return { project, access, updatedAt: updated.toISOString() };
    }),
  );
  const visible = rows.filter((r): r is VisibleProduct => r !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return [...visible.filter((p) => p.access !== "example"), ...visible.filter((p) => p.access === "example")];
}
