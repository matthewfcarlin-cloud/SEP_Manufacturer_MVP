// Serializes async work per key within this server process. Enough for v1's
// single-process, file-based storage (Railway runs one replica with a volume).
const queues = new Map<string, Promise<unknown>>();

export async function serialized<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(work);
  queues.set(key, run);
  try {
    return await run;
  } finally {
    if (queues.get(key) === run) queues.delete(key);
  }
}
