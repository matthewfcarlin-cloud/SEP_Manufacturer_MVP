import { fail } from "./api";
import { getAccessibleProject } from "./access";
import type { Project, ProjectVersion } from "./types";
import { getVersion, latestVersion } from "./versions";

export type FoundVersion = { project: Project; version: ProjectVersion };

/** Loads a project this browser may use and one of its versions (default: latest), or the 404 response to return. */
export async function findVersion(projectId: string, versionNumber?: number): Promise<FoundVersion | Response> {
  const project = (await getAccessibleProject(projectId))?.project;
  if (!project) return fail("Project not found.", 404);
  const version = versionNumber === undefined ? latestVersion(project) : getVersion(project, versionNumber);
  if (!version) return fail("Version not found.", 404);
  return { project, version };
}
