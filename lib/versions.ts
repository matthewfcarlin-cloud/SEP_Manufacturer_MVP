import type { Project, ProjectVersion } from "./types";

/** The newest version. Projects always have at least one. */
export function latestVersion(project: Project): ProjectVersion {
  return project.versions[project.versions.length - 1];
}

/** The newest version that has an analysis, for pages that need one (the pitch kit). */
export function latestAnalyzedVersion(project: Project): ProjectVersion | undefined {
  return project.versions.findLast((v) => v.analysis !== undefined);
}

export function getVersion(project: Project, number: number): ProjectVersion | undefined {
  return project.versions.find((v) => v.number === number);
}

/** One past the highest number ever kept, so a deleted number is never reused while later ones exist. */
export function nextVersionNumber(project: Project): number {
  return latestVersion(project).number + 1;
}

export function appendVersion(project: Project, version: ProjectVersion): Project {
  return { ...project, versions: [...project.versions, version] };
}

export function replaceVersion(project: Project, version: ProjectVersion): Project {
  if (!getVersion(project, version.number)) {
    throw new Error(`Project ${project.id} has no version ${version.number}`);
  }
  return { ...project, versions: project.versions.map((v) => (v.number === version.number ? version : v)) };
}

/** Version 1 keeps the pre-Phase-6 names (model.stl) so existing URLs keep working. */
export function versionFileName(number: number, baseName: string): string {
  return number === 1 ? baseName : `v${number}-${baseName}`;
}

/** Reads ?v=2 style params. Anything but a positive integer is null. */
export function parseVersionParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^[1-9]\d{0,3}$/.test(raw)) return null;
  return Number(raw);
}
