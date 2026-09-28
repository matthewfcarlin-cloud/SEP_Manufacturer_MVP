import type { Metadata } from "next";
import { NewProductFlow } from "@/components/newProduct/NewProductFlow";

export const metadata: Metadata = { title: "New product" };

/** One question per screen, full screen, then a friendly loading screen while the product is made. */
export default function NewProductPage() {
  return <NewProductFlow />;
}
