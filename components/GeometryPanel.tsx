import { formatDimensions, formatNumber } from "@/lib/format";
import { MIN_WALL_MM } from "@/lib/geometryLimits";
import type { GeometryStats } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}

function Check({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <li
      className={`flex gap-2 rounded-lg border p-3 text-sm ${
        ok ? "border-idle/30 bg-idle-soft/50" : "border-accent/40 bg-accent/10"
      }`}
    >
      <span aria-hidden className={`font-semibold ${ok ? "text-idle" : "text-accent"}`}>
        {ok ? "✓" : "!"}
      </span>
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-muted">{detail}</span>
      </span>
    </li>
  );
}

export function GeometryPanel({ geometry }: { geometry: GeometryStats }) {
  return (
    <section aria-labelledby="geometry-heading" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="geometry-heading" className="font-semibold">
          Part geometry
        </h2>
        <span className="text-xs text-muted">STL units read as mm</span>
      </div>

      <dl>
        <Row label="Bounding box" value={formatDimensions(geometry.boundingBoxMm)} />
        <Row label="Volume" value={`${formatNumber(geometry.volumeCm3)} cm³`} />
        <Row label="Surface area" value={`${formatNumber(geometry.surfaceAreaCm2)} cm²`} />
        <Row label="Triangles" value={formatNumber(geometry.triangleCount, 0)} />
      </dl>

      <ul className="flex flex-col gap-2">
        <Check
          ok={geometry.isWatertight}
          title={geometry.isWatertight ? "Watertight mesh" : "Mesh has gaps"}
          detail={
            geometry.isWatertight
              ? "Closed solid, so the volume is reliable."
              : "Open edges found. Volume and cost estimates may be off; re-export as a closed solid if you can."
          }
        />
        <Check
          ok={!geometry.thinWallWarning}
          title={geometry.thinWallWarning ? `Walls under ${MIN_WALL_MM} mm` : "Wall thickness OK"}
          detail={
            geometry.thinWallWarning
              ? "A meaningful share of the part is thinner than most processes handle reliably."
              : `No significant areas thinner than ${MIN_WALL_MM} mm.`
          }
        />
      </ul>
    </section>
  );
}
