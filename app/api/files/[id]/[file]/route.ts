import { getAccessibleProject } from "@/lib/access";
import { readProjectFile } from "@/lib/projectStore";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/files/[id]/[file]">,
): Promise<Response> {
  const { id, file } = await ctx.params;
  // Private files: only the owning browser (or anyone, for examples).
  if (!(await getAccessibleProject(id))) return new Response("Not found", { status: 404 });
  const stored = await readProjectFile(id, file);
  if (!stored) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(stored.bytes), {
    headers: {
      "Content-Type": stored.contentType,
      "Content-Length": String(stored.bytes.byteLength),
      // Not cached: a deleted project or a revoked share must stop serving at once.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
