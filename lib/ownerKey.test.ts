import { describe, expect, test } from "vitest";
import { accessFor, hashOwnerKey, isValidOwnerKey, newOwnerKey } from "./ownerKey";
import type { Project } from "./types";

const base: Project = { id: "abcdefghij", name: "P", createdAt: new Date().toISOString(), versions: [] as unknown as Project["versions"] };
const mine = newOwnerKey();
const theirs = newOwnerKey();
const owned: Project = { ...base, owner: { keyHash: hashOwnerKey(mine) } };

describe("owner keys", () => {
  test("are 256-bit, URL-safe, and distinct", () => {
    expect(mine).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mine).not.toBe(theirs);
    expect(isValidOwnerKey(mine)).toBe(true);
    expect(isValidOwnerKey("short")).toBe(false);
  });

  test("are stored only as a hash", () => {
    expect(hashOwnerKey(mine)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOwnerKey(mine)).not.toContain(mine);
  });
});

describe("accessFor", () => {
  test("the owner's browser gets in", () => {
    expect(accessFor(owned, mine)).toBe("owner");
  });

  test("any other browser, or none, is refused", () => {
    expect(accessFor(owned, theirs)).toBe("none");
    expect(accessFor(owned, undefined)).toBe("none");
  });

  test("examples are open to everyone", () => {
    expect(accessFor({ ...base, isExample: true }, undefined)).toBe("example");
    expect(accessFor({ ...base, isExample: true }, theirs)).toBe("example");
  });

  test("a project from before ownership existed can be claimed by a browser with a key", () => {
    expect(accessFor(base, mine)).toBe("claimable");
    expect(accessFor(base, undefined)).toBe("none");
  });
});
