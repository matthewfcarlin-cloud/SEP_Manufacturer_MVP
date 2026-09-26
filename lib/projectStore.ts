import { randomBytes } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectImageType, IMAGE_CONTENT_TYPES, type ImageType, type ProjectFields, type VersionFields } from "./projectInput";
import { migrateProject } from "./projectMigration";
import { serialized } from "./serialize";
import { PROJECT_ID_PATTERN, projectSchema } from "./schemas";
import type { AppliedTweak, GeometryStats, Project, ProjectVersion } from "./types";
import { appendVersion, getVersion, nextVersionNumber, replaceVersion, versionFileName } from "./versions";

// v1 storage: one folder per project under .data/projects/<id>/ holding
// project.json plus the uploaded files. Swappable for Supabase later without
// touching callers. Note: Vercel's filesystem is ephemeral, so deployed
// projects won't survive a cold start until storage moves off-disk.

const STL_FILE = "model.stl";
// Version 1 uses the bare names; version n > 1 prefixes them with "vn-".
const FILE_NAME_PATTERN = /^(v[1-9]\d{0,3}-)?(model\.stl|image-[0-4]\.(jpg|png|webp)|render-[0-3]\.png)$/;
export const RENDER_COUNT = 4;
export const MAX_RENDER_BYTES = 4 * 1024 * 1024;

export function dataRoot(): string {
  return process.env.IDLEFIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function projectDir(id: string): string {
  if (!PROJECT_ID_PATTERN.test(id)) throw new Error(`Invalid project id: ${id}`);
  return path.join(dataRoot(), "projects", id);
}

export function isValidProjectId(id: string): boolean {
  return PROJECT_ID_PATTERN.test(id);
}

function newProjectId(): string {
  // 60 bits of randomness, URL-safe, exactly 10 chars.
  return randomBytes(8).toString("base64url").slice(0, 10);
}

export function fileUrl(id: string, fileName: string): string {
  return `/api/files/${id}/${fileName}`;
}

async function writeAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, filePath);
}

type UploadedFiles = {
  stl: Uint8Array;
  geometry: GeometryStats;
  images: { type: ImageType; bytes: Uint8Array }[];
};

export type NewProjectInput = UploadedFiles & { fields: ProjectFields; ownerKeyHash: string };

export type NewVersionInput = UploadedFiles & {
  fields: VersionFields;
  basedOn: number;
  appliedTweak?: AppliedTweak;
  /** Copy the base version's photos when no new ones were uploaded. */
  keepPhotosFrom?: ProjectVersion;
};

/** Writes a version's CAD file and photos and returns their URLs. */
async function writeVersionFiles(id: string, number: number, files: UploadedFiles) {
  const dir = projectDir(id);
  const stlName = versionFileName(number, STL_FILE);
  const imageNames = files.images.map((img, i) => versionFileName(number, `image-${i}.${img.type}`));
  await writeAtomic(path.join(dir, stlName), files.stl);
  await Promise.all(files.images.map((img, i) => writeAtomic(path.join(dir, imageNames[i]), img.bytes)));
  return { cadFileUrl: fileUrl(id, stlName), imageUrls: imageNames.map((name) => fileUrl(id, name)) };
}

/** Copies another version's photos under this version's names. */
async function copyPhotos(id: string, from: ProjectVersion, toNumber: number): Promise<string[]> {
  const dir = projectDir(id);
  const names = from.imageUrls.map((url) => url.split("/").pop() ?? "").filter((n) => FILE_NAME_PATTERN.test(n));
  const copies = names.map((name, i) => versionFileName(toNumber, `image-${i}.${name.split(".").pop()}`));
  await Promise.all(names.map((name, i) => copyFile(path.join(dir, name), path.join(dir, copies[i]))));
  return copies.map((name) => fileUrl(id, name));
}

const briefFields = (fields: Omit<VersionFields, "changeNote">) => ({
  notes: fields.notes,
  targetQuantity: fields.targetQuantity,
  ...(fields.budgetUsd !== undefined && { budgetUsd: fields.budgetUsd }),
  materialHints: fields.materialHints,
});

export async function createProject(input: NewProjectInput): Promise<Project> {
  const id = newProjectId();
  await mkdir(projectDir(id), { recursive: true });
  const createdAt = new Date().toISOString();
  const project: Project = {
    id,
    name: input.fields.name,
    createdAt,
    owner: { keyHash: input.ownerKeyHash },
    versions: [
      {
        number: 1,
        createdAt,
        ...briefFields(input.fields),
        ...(await writeVersionFiles(id, 1, input)),
        geometry: input.geometry,
      },
    ],
  };
  await saveProject(project);
  return project;
}

/** Adds the next version to a project. Returns null if the project doesn't exist. */
export async function addVersion(id: string, input: NewVersionInput): Promise<{ project: Project; version: ProjectVersion } | null> {
  let added: ProjectVersion | undefined;
  const project = await updateProject(id, async (current) => {
    const number = nextVersionNumber(current);
    const files = await writeVersionFiles(id, number, input);
    const imageUrls =
      input.images.length === 0 && input.keepPhotosFrom ? await copyPhotos(id, input.keepPhotosFrom, number) : files.imageUrls;
    added = {
      number,
      createdAt: new Date().toISOString(),
      ...briefFields(input.fields),
      cadFileUrl: files.cadFileUrl,
      imageUrls,
      geometry: input.geometry,
      basedOn: input.basedOn,
      ...(input.fields.changeNote && { changeNote: input.fields.changeNote }),
      ...(input.appliedTweak && { appliedTweak: input.appliedTweak }),
    };
    return appendVersion(current, added);
  });
  return project && added ? { project, version: added } : null;
}

// Read-modify-write on project.json must not interleave: an analysis takes a
// minute or two, and a version added meanwhile would be lost when the stale
// copy is saved. Updates are serialized per project.

/**
 * Re-reads the project, applies the update, and saves the result, serialized
 * per project. Returns null when the project doesn't exist.
 */
export async function updateProject(
  id: string,
  update: (project: Project) => Project | Promise<Project>,
): Promise<Project | null> {
  return serialized(`project:${id}`, async () => {
    const current = await getProject(id);
    if (!current) return null;
    const next = await update(current);
    await saveProject(next);
    return next;
  });
}

/** Updates one version in place. Returns null when the project or version doesn't exist. */
export async function updateVersion(
  id: string,
  number: number,
  update: (version: ProjectVersion) => ProjectVersion,
): Promise<Project | null> {
  let found = true;
  const project = await updateProject(id, (current) => {
    const version = getVersion(current, number);
    if (!version) {
      found = false;
      return current;
    }
    return replaceVersion(current, update(version));
  });
  return found ? project : null;
}

export async function saveProject(project: Project): Promise<void> {
  const valid = projectSchema.parse(project);
  await writeAtomic(path.join(projectDir(valid.id), "project.json"), JSON.stringify(valid, null, 2));
}

/** Returns null when the id is malformed or no such project exists. */
export async function getProject(id: string): Promise<Project | null> {
  if (!isValidProjectId(id)) return null;
  let raw: string;
  try {
    raw = await readFile(path.join(projectDir(id), "project.json"), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  const parsed = projectSchema.safeParse(migrateProject(JSON.parse(raw)));
  if (!parsed.success) {
    throw new Error(`Project ${id} has a corrupt project.json: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** File names in the project folder that belong to one version (from its own URLs). */
function versionFileNames(version: ProjectVersion): string[] {
  const urls = [version.cadFileUrl, ...version.imageUrls, ...(version.renders ?? [])].filter((u): u is string => Boolean(u));
  return urls.map((url) => url.split("?")[0].split("/").pop() ?? "").filter((name) => FILE_NAME_PATTERN.test(name));
}

export type DeleteVersionResult = "deleted" | "only-version" | "not-found";

/** Removes one version's entry and its files. The last version can't be deleted; delete the project instead. */
export async function deleteVersion(id: string, number: number): Promise<DeleteVersionResult> {
  if (!isValidProjectId(id)) return "not-found";
  let result = "not-found" as DeleteVersionResult; // assigned inside the update callback
  let removed: ProjectVersion | undefined;
  await updateProject(id, (project) => {
    removed = getVersion(project, number);
    if (!removed) return project;
    if (project.versions.length === 1) {
      result = "only-version";
      return project;
    }
    result = "deleted";
    return { ...project, versions: project.versions.filter((v) => v.number !== number) };
  });
  if (result === "deleted" && removed) {
    await Promise.all(versionFileNames(removed).map((name) => rm(path.join(projectDir(id), name), { force: true })));
  }
  return result;
}

/** Removes the project folder: project.json and every uploaded or generated file. False if it didn't exist. */
export async function deleteProject(id: string): Promise<boolean> {
  if (!isValidProjectId(id)) return false;
  const dir = projectDir(id);
  try {
    await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
  await rm(dir, { recursive: true, force: true });
  return true;
}

export class RenderError extends Error {}

/**
 * Saves a version's four studio renders (PNGs captured in the browser) and
 * points version.renders at them. The URLs carry a timestamp because files
 * are served with a year-long cache and a re-render overwrites them.
 */
export async function saveVersionRenders(id: string, number: number, pngs: Uint8Array[]): Promise<ProjectVersion | null> {
  if (pngs.length !== RENDER_COUNT) throw new RenderError(`Send exactly ${RENDER_COUNT} renders.`);
  for (const png of pngs) {
    if (png.byteLength > MAX_RENDER_BYTES) throw new RenderError("A render is too large.");
    if (detectImageType(png) !== "png") throw new RenderError("Renders must be PNG images.");
  }
  if (!isValidProjectId(id)) return null;
  const stamp = Date.now();
  const saved = await updateVersion(id, number, (version) => ({
    ...version,
    renders: pngs.map((_, i) => `${fileUrl(id, versionFileName(number, `render-${i}.png`))}?v=${stamp}`),
  }));
  if (!saved) return null;
  // Written after the version is known to exist, so a bad id can't leave files behind.
  await Promise.all(pngs.map((png, i) => writeAtomic(path.join(projectDir(id), versionFileName(number, `render-${i}.png`)), png)));
  return getVersion(saved, number) ?? null;
}

export type StoredFile = { bytes: Uint8Array; contentType: string };

/** Reads an uploaded file. Only known file names are allowed, so no path traversal. */
export async function readProjectFile(id: string, fileName: string): Promise<StoredFile | null> {
  if (!isValidProjectId(id) || !FILE_NAME_PATTERN.test(fileName)) return null;
  try {
    const bytes = await readFile(path.join(projectDir(id), fileName));
    const ext = fileName.split(".").pop() as ImageType | "stl";
    const contentType = ext === "stl" ? "model/stl" : IMAGE_CONTENT_TYPES[ext];
    return { bytes, contentType };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export type ProjectImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

/** Loads a version's uploaded photos as base64, in upload order. */
export async function getVersionImages(projectId: string, version: ProjectVersion): Promise<ProjectImage[]> {
  const names = version.imageUrls.map((url) => url.split("/").pop() ?? "");
  const files = await Promise.all(names.map((name) => readProjectFile(projectId, name)));
  return files
    .filter((f): f is StoredFile => f !== null)
    .map((f) => ({
      mediaType: f.contentType as ProjectImage["mediaType"],
      base64: Buffer.from(f.bytes).toString("base64"),
    }));
}

/**
 * All stored projects, newest first. A project folder with a missing or
 * corrupt project.json is skipped (and logged) so one bad folder can't take
 * down the list.
 */
export async function listProjects(): Promise<Project[]> {
  let ids: string[];
  try {
    ids = (await readdir(path.join(dataRoot(), "projects"))).filter(isValidProjectId);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getProject(id);
      } catch (err) {
        console.error(`[projectStore] skipping unreadable project ${id}`, err);
        return null;
      }
    }),
  );
  return results
    .filter((p): p is Project => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
