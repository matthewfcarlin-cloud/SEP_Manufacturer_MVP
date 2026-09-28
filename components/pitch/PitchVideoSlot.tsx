import type { PitchVideo } from "@/lib/types";

/**
 * Where the generated pitch video goes. Nothing generates one yet: the slot
 * shows a clear placeholder, and plays the video once a provider sets
 * `pitchVideo` to { status: "ready", url }.
 */
export function PitchVideoSlot({ video }: { video?: PitchVideo }) {
  if (video?.status === "ready") {
    return (
      <video controls src={video.url} className="aspect-video w-full rounded-card bg-sidebar" aria-label="Pitch video">
        <track kind="captions" />
      </video>
    );
  }
  return (
    <div className="grid aspect-video w-full place-items-center rounded-card bg-sidebar p-6 text-center text-ink">
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-pill bg-surface text-xl text-accent-ink shadow-card">
          ▶
        </span>
        <p className="text-[13px] font-medium text-accent-ink">Pitch video · not generated yet</p>
        <p className="max-w-sm text-sm text-ink-2">A 30-second video made from the storyboard below will play here.</p>
      </div>
    </div>
  );
}
