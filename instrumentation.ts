// Runs once when the server starts (Next.js instrumentation hook). Node-only
// checks are imported only in the Node runtime, as Next's docs require.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertKeyEncryptionConfigured } = await import("./lib/ai/startupCheck");
  assertKeyEncryptionConfigured();
}
