import type { ReactNode } from "react";

/** One pitch section; in print, each starts a new landscape page. */
export function PitchSection({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="pitch-page flex flex-col gap-6 border-t border-border pt-10 first:border-t-0 first:pt-0">
      <div>
        <p className="text-[13px] font-medium text-accent-ink">{eyebrow}</p>
        <h2 id={id} className="type-h2 mt-2">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function RenderStill({ src, caption, alt, isHero = false }: { src: string; caption: string; alt: string; isHero?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-card bg-sidebar">
      {/* eslint-disable-next-line @next/next/no-img-element -- stored render served by our own API */}
      <img src={src} alt={alt} className={isHero ? "w-full" : "aspect-[4/3] w-full object-cover"} />
      <figcaption className="border-t border-border px-3 py-2 text-[13px] font-medium text-ink-2">{caption}</figcaption>
    </figure>
  );
}

export function MissingText({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-bg p-5 text-sm text-ink-2">{children}</p>;
}
