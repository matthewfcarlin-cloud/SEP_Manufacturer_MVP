import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { NewProjectForm } from "./NewProjectForm";

export const metadata: Metadata = { title: "Start a project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow="Step 01 · Upload"
        title="Start a project"
        description="Upload your part and tell us what you know. We'll measure it, then work out how it could be made and who nearby has the machines for it."
      />
      <NewProjectForm />
    </div>
  );
}
