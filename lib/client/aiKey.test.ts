import { afterEach, describe, expect, test, vi } from "vitest";
import { getKeyState, maskKey, saveKey } from "./aiKey";

const respond = (status: number, body: unknown, contentType = "application/json") =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": contentType } }));

afterEach(() => vi.restoreAllMocks());

describe("aiKey client", () => {
  test("reports the backend as unavailable while the route doesn't exist (Next's HTML 404)", async () => {
    respond(404, "<html>not found</html>", "text/html");
    expect(await getKeyState()).toEqual({ available: false });
  });

  test("never invents a saved key: no key is null", async () => {
    respond(200, { success: true, data: null, error: null });
    expect(await getKeyState()).toEqual({ available: true, saved: null });
  });

  test("returns the server's masked key", async () => {
    const saved = { provider: "anthropic", maskedKey: "sk-ant-…7Q2f", savedAt: "2026-09-27T12:00:00.000Z" };
    respond(200, { success: true, data: saved, error: null });
    expect(await getKeyState()).toEqual({ available: true, saved });
  });

  test("saving before the backend exists says coming soon", async () => {
    respond(404, "<html>not found</html>", "text/html");
    expect(await saveKey("anthropic", "sk-ant-x")).toMatchObject({ ok: false, comingSoon: true });
  });

  test("masks keys for display", () => {
    expect(maskKey("sk-ant-api03-abcdefghijklmnop7Q2f")).toBe("sk-ant-…7Q2f");
    expect(maskKey("sk-proj-abcdefghijklmnopWXYZ")).toBe("sk-…WXYZ");
  });
});
