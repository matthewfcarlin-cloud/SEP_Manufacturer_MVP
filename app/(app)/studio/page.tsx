import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { NewProductButton } from "@/components/shell/NewProductButton";
import { ContinueCard } from "@/components/studio/ContinueCard";
import { GettingStarted } from "@/components/studio/GettingStarted";
import { Greeting } from "@/components/studio/Greeting";
import { ProductCard } from "@/components/studio/ProductCard";
import { summariesOf } from "@/components/studio/summaries";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { gettingStarted } from "@/lib/studio/home";
import { visibleProducts } from "@/lib/studio/visibleProducts";

export const metadata: Metadata = { title: "Home" };

/** Home: a greeting, the product to continue, the first-product setup guide, and every product as a card. */
export default async function HomeDashboard() {
  const products = await visibleProducts();
  const own = products.filter((p) => p.access === "owner");
  const cards = summariesOf(products);
  const current = own[0]; // newest change first
  const currentCard = current && cards[products.indexOf(current)];
  const first = own.at(-1); // "Your first product" is the oldest one

  return (
    <div className="mx-auto flex max-w-content flex-col gap-12 page-pad py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <Greeting />
          <p className="text-ink-2">Here&apos;s where your products stand.</p>
        </div>
        <div className="shrink-0">
          <NewProductButton />
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {current && currentCard ? (
          <ContinueCard project={current.project} summary={currentCard} />
        ) : (
          <div className="card">
            <EmptyState
              illustration="spark"
              title="Start your first product"
              sentence="Describe your idea, add a 3D file or a photo if you have one, and Moko shows you how to make it and sell it."
              action={
                <ButtonLink href="/new" icon={Plus}>
                  Start your product
                </ButtonLink>
              }
            />
          </div>
        )}
        <GettingStarted guide={gettingStarted(first?.project)} />
      </div>

      <section aria-labelledby="products-heading" className="flex flex-col gap-5">
        <h2 id="products-heading" className="type-h2">
          Your products
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {cards.map((card) => (
            <li key={card.id}>
              <ProductCard product={card} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
