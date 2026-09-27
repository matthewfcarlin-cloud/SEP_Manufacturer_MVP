import { fail } from "./api";
import { getAccessibleProject, type AccessibleProject } from "./access";
import type { Project, ProjectVersion } from "./types";
import { getVersion, latestVersion } from "./versions";

export type FoundVersion = { project: Project; version: ProjectVersion; access: AccessibleProject["access"] };

/** Loads a project this browser may use and one of its versions (default: latest), or the 404 response to return. */
export async function findVersion(projectId: string, versionNumber?: number): Promise<FoundVersion | Response> {
  const found = await getAccessibleProject(projectId);
  if (!found) return fail("Project not found.", 404);
  const { project, access } = found;
  const version = versionNumber === undefined ? latestVersion(project) : getVersion(project, versionNumber);
  if (!version) return fail("Version not found.", 404);
  return { project, version, access };
}
