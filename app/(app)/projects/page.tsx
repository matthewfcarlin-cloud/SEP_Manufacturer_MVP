import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { NewProductButton } from "@/components/shell/NewProductButton";
import { ProductGrid } from "@/components/studio/ProductGrid";
import { summariesOf } from "@/components/studio/summaries";
import { visibleProducts } from "@/lib/studio/visibleProducts";

export const metadata: Metadata = { title: "My products" };

/** My products: every product as a card, with search and sort. */
export default async function ProductsPage() {
  const products = summariesOf(await visibleProducts());
  return (
    <div className="mx-auto flex max-w-content flex-col gap-8 page-pad py-10">
      <PageHeader title="My products" description="Everything you're making, where each one stands, and what to do next." actions={<NewProductButton />} />
      <ProductGrid products={products} />
    </div>
  );
}
