import type { ReactNode } from "react";

/** One pitch section; in print, each starts a new landscape page. */
export function PitchSection({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="pitch-page flex flex-col gap-6 border-t border-line pt-10 first:border-t-0 first:pt-0">
      <div>
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h2 id={id} className="display-type mt-2 text-[clamp(1.9rem,3.8vw,3rem)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function RenderStill({ src, caption, alt, isHero = false }: { src: string; caption: string; alt: string; isHero?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-[#f6f4ef]">
      {/* eslint-disable-next-line @next/next/no-img-element -- stored render served by our own API */}
      <img src={src} alt={alt} className={isHero ? "w-full" : "aspect-[4/3] w-full object-cover"} />
      <figcaption className="border-t border-line px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted">{caption}</figcaption>
    </figure>
  );
}

export function MissingText({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">{children}</p>;
}
