import { listOutcomes } from "../db/learningStore";
import { listProjects } from "../projectStore";
import type { Outcome, ProductFeatures, Project, ProjectVersion } from "../types";
import { buildFeatureRows, isContributing, queryFeatures } from "./features";
import { findSimilar, similarProductsBlock } from "./similar";

// Loads current data for the features job. Deliberately uncached: an
// opt-out or a delete is reflected on the very next prompt. At demo scale
// (tens of products) this is a few file reads per AI call; A3 moves it to a
// database query.

async function contributingEntries(projects: Project[]): Promise<{ project: Project; outcomes: Outcome[] }[]> {
  const contributing = projects.filter(isContributing);
  return Promise.all(contributing.map(async (project) => ({ project, outcomes: await listOutcomes(project.id) })));
}

export async function currentFeatureRows(): Promise<{ projects: number; contributingProjects: number; rows: ProductFeatures[] }> {
  const projects = await listProjects();
  const entries = await contributingEntries(projects);
  return { projects: projects.length, contributingProjects: entries.length, rows: buildFeatureRows(entries) };
}

/**
 * The "similar products" prompt block for this version, or null when there's
 * nothing to cite. Never throws: an analysis must not fail because retrieval did.
 */
export async function similarProductsFor(project: Project, version: ProjectVersion): Promise<string | null> {
  try {
    const { rows } = await currentFeatureRows();
    return similarProductsBlock(findSimilar(queryFeatures(project, version), rows));
  } catch (err) {
    console.error(`[learning] similar-product lookup failed for ${project.id}`, err);
    return null;
  }
}
