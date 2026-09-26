import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_CONTENT_TYPES, type ImageType, type ProjectFields } from "./projectInput";
import { PROJECT_ID_PATTERN, projectSchema } from "./schemas";
import type { GeometryStats, Project } from "./types";

// v1 storage: one folder per project under .data/projects/<id>/ holding
// project.json plus the uploaded files. Swappable for Supabase later without
// touching callers. Note: Vercel's filesystem is ephemeral, so deployed
// projects won't survive a cold start until storage moves off-disk.

const STL_FILE = "model.stl";
const FILE_NAME_PATTERN = /^(model\.stl|image-[0-4]\.(jpg|png|webp))$/;

function dataRoot(): string {
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

export type NewProjectInput = {
  fields: ProjectFields;
  stl: Uint8Array;
  geometry: GeometryStats;
  images: { type: ImageType; bytes: Uint8Array }[];
};

export async function createProject(input: NewProjectInput): Promise<Project> {
  const id = newProjectId();
  const dir = projectDir(id);
  await mkdir(dir, { recursive: true });

  await writeAtomic(path.join(dir, STL_FILE), input.stl);
  const imageNames = input.images.map((img, i) => `image-${i}.${img.type}`);
  await Promise.all(
    input.images.map((img, i) => writeAtomic(path.join(dir, imageNames[i]), img.bytes)),
  );

  const project: Project = {
    id,
    name: input.fields.name,
    createdAt: new Date().toISOString(),
    notes: input.fields.notes,
    targetQuantity: input.fields.targetQuantity,
    ...(input.fields.budgetUsd !== undefined && { budgetUsd: input.fields.budgetUsd }),
    materialHints: input.fields.materialHints,
    cadFileUrl: fileUrl(id, STL_FILE),
    imageUrls: imageNames.map((name) => fileUrl(id, name)),
    geometry: input.geometry,
  };
  await saveProject(project);
  return project;
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
  const parsed = projectSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Project ${id} has a corrupt project.json: ${parsed.error.message}`);
  }
  return parsed.data;
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
