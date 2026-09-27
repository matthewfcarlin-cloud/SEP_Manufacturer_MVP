import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAccessibleProject } from "@/lib/access";
import { latestVersion } from "@/lib/versions";
import { SellingPanel } from "./selling-panel";

export default async function LaunchPage(props: PageProps<"/project/[id]/launch">) {
  const { id } = await props.params;
  const found = await getAccessibleProject(id);
  if (!found) notFound();
  const version = latestVersion(found.project);
  return <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
    <PageHeader eyebrow={`${found.project.name} · v${version.number} · Launch`} title="Launch & sell" description="Build a launch plan, review the pitch kit, and prepare an Etsy listing." actions={<Link className="eyebrow border border-line px-4 py-3 text-xs hover:border-accent" href={`/project/${found.project.id}/pitch`}>OPEN PITCH KIT ↗</Link>} />
    <section className="bg-night p-6 text-night-ink sm:p-10">
      <p className="eyebrow text-night-muted">STAGE 06 / SELL</p>
      <h2 className="display-type mt-3 text-4xl sm:text-6xl">Your listing, ready to sell.</h2>
      <p className="mt-4 max-w-2xl text-night-muted">Draft a product title, description, tags and price, with photos from your saved pitch-kit renders.</p>
    </section>
    <SellingPanel projectId={found.project.id} version={version.number} initial={version.listing} businessCase={version.businessCase} analysis={version.analysis} targetQuantity={version.targetQuantity} />
  </main>;
}
