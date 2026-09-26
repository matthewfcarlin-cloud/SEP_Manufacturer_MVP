import { resolveShare } from "./shareStore";
import type { Analysis, Project, ProjectVersion } from "./types";
import { latestAnalyzedVersion } from "./versions";

export type SharedPitch = { project: Project; version: ProjectVersion & { analysis: Analysis } };

const RENDER_FILE = /^(v[1-9]\d{0,3}-)?render-[0-3]\.png$/;
const fileNameOf = (url: string) => url.split("?")[0].split("/").pop() ?? "";

/**
 * What a share link exposes: the pitched version, with render URLs pointed at
 * the share-scoped file route so the viewer never needs project access.
 */
export async function loadSharedPitch(token: string): Promise<SharedPitch | null> {
  const project = await resolveShare(token);
  const version = project && latestAnalyzedVersion(project);
  if (!project || !version?.analysis) return null;
  const renders = version.renders?.map((url) => {
    const query = url.includes("?") ? `?${url.split("?")[1]}` : "";
    return `/api/share/${token}/${fileNameOf(url)}${query}`;
  });
  return { project, version: { ...version, analysis: version.analysis, ...(renders && { renders }) } };
}

/** Share links serve the pitched version's renders and nothing else. */
export function isSharedFile(shared: SharedPitch, file: string): boolean {
  return RENDER_FILE.test(file) && (shared.version.renders ?? []).some((url) => fileNameOf(url) === file);
}
