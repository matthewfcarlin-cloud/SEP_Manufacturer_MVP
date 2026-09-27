import { encryptionSecret, KeyEncryptionConfigError } from "./keyCrypto";

/**
 * Node-only startup check (imported by instrumentation.ts in the Node
 * runtime). Exits the process without a valid KEY_ENCRYPTION_SECRET, so the
 * host reports a crashed deploy instead of an app that fails when a creator
 * saves their API key.
 */
export function assertKeyEncryptionConfigured(): void {
  try {
    encryptionSecret();
  } catch (err) {
    if (!(err instanceof KeyEncryptionConfigError)) throw err;
    console.error(`[startup] ${err.message}`);
    process.exit(1);
  }
}
