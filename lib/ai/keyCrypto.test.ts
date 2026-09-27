import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { decryptKey, encryptKey, encryptionSecret, KeyEncryptionConfigError } from "./keyCrypto";

const API_KEY = "sk-ant-api03-TESTKEY-abcdefghijklmnopqrstuvwxyz0123456789";
const WS_A = "a".repeat(64);
const WS_B = "b".repeat(64);
const SECRET = randomBytes(32).toString("base64");

beforeEach(() => {
  process.env.KEY_ENCRYPTION_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.KEY_ENCRYPTION_SECRET;
});

describe("encryptKey / decryptKey", () => {
  test("round-trips a key for the same workspace", () => {
    const sealed = encryptKey(API_KEY, WS_A);
    expect(decryptKey(sealed, WS_A)).toBe(API_KEY);
  });

  test("the sealed form never contains the key, and each seal uses a fresh IV", () => {
    const a = encryptKey(API_KEY, WS_A);
    const b = encryptKey(API_KEY, WS_A);
    expect(JSON.stringify(a)).not.toContain("TESTKEY");
    expect(JSON.stringify(a)).not.toContain(Buffer.from(API_KEY).toString("base64").slice(0, 20));
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  test("a key sealed for one workspace won't open in another", () => {
    const sealed = encryptKey(API_KEY, WS_A);
    expect(() => decryptKey(sealed, WS_B)).toThrow();
  });

  test("tampering with the ciphertext or tag is detected", () => {
    const sealed = encryptKey(API_KEY, WS_A);
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] ^= 1;
    expect(() => decryptKey({ ...sealed, ciphertext: flipped.toString("base64") }, WS_A)).toThrow();
    expect(() => decryptKey({ ...sealed, authTag: Buffer.alloc(16).toString("base64") }, WS_A)).toThrow();
  });

  test("a different server secret can't open it", () => {
    const sealed = encryptKey(API_KEY, WS_A);
    process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
    expect(() => decryptKey(sealed, WS_A)).toThrow();
  });
});

describe("encryptionSecret", () => {
  test("reads a base64-encoded 32-byte secret", () => {
    expect(encryptionSecret()).toHaveLength(32);
  });

  test("missing secret fails loudly with instructions", () => {
    delete process.env.KEY_ENCRYPTION_SECRET;
    expect(() => encryptionSecret()).toThrow(KeyEncryptionConfigError);
    expect(() => encryptionSecret()).toThrow(/openssl rand -base64 32/);
  });

  test.each(["short", randomBytes(16).toString("base64"), randomBytes(48).toString("base64"), "!".repeat(44)])(
    "rejects a secret that isn't 32 bytes of base64 (%s)",
    (bad) => {
      process.env.KEY_ENCRYPTION_SECRET = bad;
      expect(() => encryptionSecret()).toThrow(KeyEncryptionConfigError);
    },
  );

  test("the config error never repeats the secret's value", () => {
    process.env.KEY_ENCRYPTION_SECRET = "not-a-valid-secret-value";
    expect(() => encryptionSecret()).toThrow(expect.objectContaining({ message: expect.not.stringContaining("not-a-valid-secret-value") }));
  });
});
