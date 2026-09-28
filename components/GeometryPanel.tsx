import { AlertTriangle, CircleCheck } from "lucide-react";
import { formatDimensions, formatNumber } from "@/lib/format";
import { MIN_WALL_MM } from "@/lib/geometryLimits";
import { estimateMassGrams, REFERENCE_DENSITIES } from "@/lib/materials";
import { scaleWarning } from "@/lib/units";
import type { GeometryStats } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="text-right font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}

function Check({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <li
      className={`flex gap-2.5 rounded-control p-3 text-[14px] ${ok ? "bg-green-soft" : "bg-amber-soft"}`}
    >
      {ok ? (
        <CircleCheck aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-green-ink" />
      ) : (
        <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-amber-ink" />
      )}
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-ink-2">{detail}</span>
      </span>
    </li>
  );
}

export function GeometryPanel({ geometry }: { geometry: GeometryStats }) {
  const sizeWarning = scaleWarning(geometry.boundingBoxMm);
  return (
    <section aria-labelledby="geometry-heading" className="card card-pad flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="geometry-heading" className="type-h3">
          Part geometry
        </h2>
        <span className="text-[13px] text-ink-2">Measured in mm</span>
      </div>

      <dl>
        <Row label="Size" value={formatDimensions(geometry.boundingBoxMm)} />
        <Row label="Volume" value={`${formatNumber(geometry.volumeCm3)} cm³`} />
        <Row label="Surface area" value={`${formatNumber(geometry.surfaceAreaCm2)} cm²`} />
        {geometry.typicalWallMm !== undefined && (
          <Row label="Typical wall" value={`${formatNumber(geometry.typicalWallMm)} mm`} />
        )}
        <Row label="Detail in the 3D file (triangles)" value={formatNumber(geometry.triangleCount, 0)} />
      </dl>

      <div className="rounded-control bg-bg p-3">
        <p className="mb-2 text-[13px] text-ink-2">Estimated weight</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {REFERENCE_DENSITIES.map((m) => (
            <div key={m.name} className="flex justify-between gap-2">
              <dt className="text-ink-2 capitalize">{m.name}</dt>
              <dd className="font-mono">{estimateMassGrams(geometry.volumeCm3, m.gPerCm3)} g</dd>
            </div>
          ))}
        </dl>
      </div>

      <ul className="flex flex-col gap-2">
        {sizeWarning && <Check ok={false} title="Check the units" detail={sizeWarning} />}
        <Check
          ok={geometry.isWatertight}
          title={geometry.isWatertight ? "Closed, solid shape" : "The shape has gaps"}
          detail={
            geometry.isWatertight
              ? "No holes in the surface, so the size and volume are reliable."
              : "The 3D file has holes in its surface. Volume and cost estimates may be off; save it again as a closed solid if you can."
          }
        />
        <Check
          ok={!geometry.thinWallWarning}
          title={geometry.thinWallWarning ? `Some walls are under ${MIN_WALL_MM} mm thick` : "Walls are thick enough"}
          detail={
            geometry.thinWallWarning
              ? "A meaningful share of the part is thinner than most processes handle reliably. Use “Show thin walls” on the model to see where."
              : `No significant areas thinner than ${MIN_WALL_MM} mm.`
          }
        />
      </ul>
    </section>
  );
}
