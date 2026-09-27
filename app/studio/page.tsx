import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StudioCard } from "@/components/studio/StudioCard";
import { currentOwnerKey } from "@/lib/access";
import { accessFor } from "@/lib/ownerKey";
import { listProjects } from "@/lib/projectStore";
import { getShops, summarizeShops } from "@/lib/shops";

export const metadata: Metadata = { title: "Studio" };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 border-l border-night-line pl-4">
      <dt className="eyebrow text-night-muted">{label}</dt>
      <dd className="display-type text-4xl tabular-nums text-night-ink">{value}</dd>
    </div>
  );
}

/** The creators' home: every product, where it stands, and the single next thing to do. */
export default async function StudioPage() {
  await connection(); // read the project folder per request
  const ownerKey = await currentOwnerKey();
  const visible = (await listProjects())
    .map((project) => ({ project, access: accessFor(project, ownerKey) }))
    .filter(({ access }) => access !== "none");
  // Your own products first (newest first), then the shared examples.
  const products = [...visible.filter((p) => p.access !== "example"), ...visible.filter((p) => p.access === "example")];
  const versions = products.reduce((n, { project }) => n + project.versions.length, 0);
  const { idleMachines } = summarizeShops(getShops());

  return (
    <>
      <section className="border-b border-night-line bg-night text-night-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 sm:py-20 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <p className="eyebrow text-night-accent">Your studio</p>
            <h1 className="display-type text-[clamp(3.5rem,11vw,9rem)] leading-[0.85]">Studio</h1>
            <p className="max-w-md text-night-muted">Every product, where it stands on the way to its first sale, and the one thing to do next.</p>
          </div>
          <dl className="grid grid-cols-3 gap-6">
            <Stat label="Products" value={products.length} />
            <Stat label="Versions" value={versions} />
            <Stat label="Machines idle in LA" value={idleMachines} />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <ul className="grid gap-6 lg:grid-cols-2">
          {products.map(({ project, access }) => (
            <li key={project.id} className="flex min-w-0">
              <StudioCard project={project} isExample={access === "example"} />
            </li>
          ))}
          <li className="flex min-w-0">
            <Link
              href="/new"
              className="group flex min-h-72 w-full flex-col items-center justify-center gap-3 border border-dashed border-line p-8 text-center transition-colors hover:border-ink"
            >
              <span aria-hidden className="grid h-12 w-12 place-items-center border border-line text-2xl text-muted group-hover:border-ink group-hover:text-ink">
                +
              </span>
              <span className="display-type text-2xl">Start a product</span>
              <span className="max-w-xs text-sm text-muted">Upload a CAD file, photos and what you know. We&apos;ll measure it and show how it could be made.</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
