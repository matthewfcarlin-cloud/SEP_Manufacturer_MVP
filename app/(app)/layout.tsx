import { connection } from "next/server";
import { AppFrame } from "@/components/shell/AppFrame";
import { visibleProducts } from "@/lib/studio/visibleProducts";
import { browserBudgetLimitUsd } from "@/lib/usage/budget";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";

const RECENT_COUNT = 3;

/** Every app page: the light sidebar (bottom tabs on phones). Pages bring their own headers. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // the product list is per browser and changes as it's used
  const products = await visibleProducts();
  const recent = products.slice(0, RECENT_COUNT).map(({ project, access }) => ({
    id: project.id,
    name: project.name,
    isExample: access === "example",
    thumb: (latestAnalyzedVersion(project) ?? latestVersion(project)).renders?.[0],
  }));
  return (
    <AppFrame recent={recent} limitUsd={browserBudgetLimitUsd()}>
      {children}
    </AppFrame>
  );
}
