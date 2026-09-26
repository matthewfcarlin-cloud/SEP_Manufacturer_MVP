import { readProjectFile } from "@/lib/projectStore";
import { isSharedFile, loadSharedPitch } from "@/lib/sharedPitch";

/** Renders for a public pitch link. Anything else (the CAD file, photos) is not reachable this way. */
export async function GET(_request: Request, ctx: RouteContext<"/api/share/[token]/[file]">): Promise<Response> {
  const { token, file } = await ctx.params;
  const shared = await loadSharedPitch(token);
  if (!shared || !isSharedFile(shared, file)) return new Response("Not found", { status: 404 });
  const stored = await readProjectFile(shared.project.id, file);
  if (!stored) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(stored.bytes), {
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
