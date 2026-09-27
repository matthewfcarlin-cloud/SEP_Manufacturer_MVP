// Runs once when the server starts (Next.js instrumentation hook). Refuses to
// start without a valid KEY_ENCRYPTION_SECRET: the process exits, so the host
// reports a crashed deploy instead of an app that fails when a creator saves
// their API key.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { encryptionSecret, KeyEncryptionConfigError } = await import("./lib/ai/keyCrypto");
  try {
    encryptionSecret();
  } catch (err) {
    if (!(err instanceof KeyEncryptionConfigError)) throw err;
    console.error(`[startup] ${err.message}`);
    process.exit(1);
  }
}
