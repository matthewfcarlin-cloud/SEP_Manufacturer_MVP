// Projects saved before Phase 6 are one flat record. Everything except the
// identity fields belonged to what is now version 1, so migration moves those
// fields into versions[0] and changes nothing else: v1's files keep their
// names and URLs. getProject() runs this on every read, and the next save
// writes the new shape.

const IDENTITY_FIELDS = new Set(["id", "name", "createdAt"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns the project in the versioned shape. Unknown input is passed through for the schema to reject. */
export function migrateProject(raw: unknown): unknown {
  if (!isRecord(raw) || Array.isArray(raw.versions)) return raw;
  const identity = Object.fromEntries(Object.entries(raw).filter(([key]) => IDENTITY_FIELDS.has(key)));
  const versionFields = Object.fromEntries(Object.entries(raw).filter(([key]) => !IDENTITY_FIELDS.has(key)));
  return { ...identity, versions: [{ number: 1, createdAt: raw.createdAt, ...versionFields }] };
}
