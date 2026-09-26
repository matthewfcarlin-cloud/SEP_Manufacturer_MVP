import type { Metadata } from "next";
import { NewProjectForm } from "./NewProjectForm";

export const metadata: Metadata = { title: "Start a project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Start a project</h1>
        <p className="text-muted">
          Upload your part and tell us what you know. We&apos;ll measure it, then work out how it
          could be made and who nearby has the machines for it.
        </p>
      </header>
      <NewProjectForm />
    </div>
  );
}
