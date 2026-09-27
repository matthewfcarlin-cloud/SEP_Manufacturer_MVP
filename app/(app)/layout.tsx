import { connection } from "next/server";
import { AppFrame } from "@/components/shell/AppFrame";
import { visibleProducts } from "@/lib/studio/visibleProducts";

const RECENT_COUNT = 3;

/** Every page after the home page: sidebar, top bar with the AI pill and "+ New product". */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // the product list is per browser and changes as it's used
  const products = await visibleProducts();
  const productNames = Object.fromEntries(products.map(({ project }) => [project.id, project.name]));
  const recent = products.slice(0, RECENT_COUNT).map(({ project, access }) => ({ id: project.id, name: project.name, isExample: access === "example" }));
  return (
    <AppFrame recent={recent} productNames={productNames}>
      {children}
    </AppFrame>
  );
}
