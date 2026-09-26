import { readProjectFile } from "@/lib/projectStore";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/files/[id]/[file]">,
): Promise<Response> {
  const { id, file } = await ctx.params;
  const stored = await readProjectFile(id, file);
  if (!stored) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(stored.bytes), {
    headers: {
      "Content-Type": stored.contentType,
      "Content-Length": String(stored.bytes.byteLength),
      // Uploads are write-once, so they can be cached hard.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
