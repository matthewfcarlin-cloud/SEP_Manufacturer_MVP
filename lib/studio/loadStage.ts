import { notFound } from "next/navigation";
import { getAccessibleProject } from "../access";
import { getVersion, latestVersion, parseVersionParam } from "../versions";

/**
 * A stage screen's product and version: the latest, or ?v=N where the screen
 * supports older versions. A product this browser can't open is a 404.
 */
export async function loadStage(id: string, v?: string | string[]) {
  const found = await getAccessibleProject(id);
  if (!found) notFound();
  const requested = parseVersionParam(v);
  const version = requested === null ? latestVersion(found.project) : getVersion(found.project, requested);
  if (!version) notFound();
  return { ...found, version };
}
