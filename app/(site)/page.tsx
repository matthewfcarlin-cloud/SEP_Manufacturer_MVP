import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import { Faq } from "@/components/home/Faq";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StageCards } from "@/components/home/StageCards";
import { ButtonLink } from "@/components/ui/Button";
import sampleProject from "@/demo/sample-project.json";
import { getProject } from "@/lib/projectStore";
import { projectSchema } from "@/lib/schemas";

/** The landing page (§4): one big moment, how it works, the six stages, questions, and a last call to action. */
export default async function Home() {
  // Per request: whether the example is installed can change after the build.
  await connection();
  const demo = projectSchema.parse(sampleProject);
  const exampleHref = (await getProject(demo.id)) ? `/project/${demo.id}` : null;

  return (
    <>
      <Hero exampleHref={exampleHref} />
      <HowItWorks />
      <StageCards />
      <Faq />

      <section aria-labelledby="cta-heading" className="bg-accent-soft py-16">
        <div className="mx-auto flex max-w-content flex-col items-start gap-6 page-pad sm:items-center sm:text-center">
          <h2 id="cta-heading" className="type-h1">Got an idea? Let&apos;s make it real.</h2>
          <p className="max-w-lg text-ink-2">It takes about two minutes to start, and you don&apos;t need a 3D file.</p>
          <ButtonLink href="/new" size="lg" iconRight={ArrowRight}>
            Start your product
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
