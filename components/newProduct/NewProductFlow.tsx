"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Logo } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { FormError, isStep, useUploadFiles } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import { EMPTY_ANSWERS, formFields, loadingLines, parseDraft, serializeDraft, STEPS, stepError, type Answers, type Step } from "@/lib/newProduct/flow";
import type { StlUnit } from "@/lib/units";
import { CreatingScreen } from "./CreatingScreen";
import { Dropzone } from "./Dropzone";
import { QuantityTiles } from "./QuantityTiles";
import { ReviewStep, type AiChoice } from "./ReviewStep";

const DRAFT_KEY = "moko:new-product-draft";
/** Keep the loading screen up long enough to read a line, even when saving is instant. */
const MIN_LOADING_MS = 1600;

const QUESTIONS: Record<Step, { title: string; helper: string }> = {
  what: { title: "What are you making?", helper: "A name and a sentence are plenty. You can change both later." },
  look: { title: "Show us what it looks like.", helper: "A 3D file gives exact sizes; photos and sketches help too." },
  howMany: { title: "How many do you want to make?", helper: "It changes how it's best made and what each one costs." },
  budget: { title: "Do you have a budget?", helper: "Roughly what you can spend on the first run, in US dollars." },
  review: { title: "Does this look right?", helper: "Check your answers, then create your product." },
};

const readDraft = (): Answers | null => {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
};
const writeDraft = (a: Answers | null) => {
  try {
    if (a) window.localStorage.setItem(DRAFT_KEY, serializeDraft(a));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked: the draft just isn't kept.
  }
};

async function postJson<T>(url: string, method: "POST" | "PUT", body: object): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json?.success) throw new Error(json?.error ?? "Something went wrong. Please try again.");
  return json.data;
}

/**
 * The new-product flow (design/DESIGN.md §4): full screen, one question per
 * screen, Back and Continue at the bottom (Enter continues), a review, then a
 * friendly loading screen while the product is saved and, if the creator
 * chose it, analyzed.
 */
export function NewProductFlow() {
  const router = useRouter();
  const toast = useToast();
  const files = useUploadFiles();
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [units, setUnits] = useState<StlUnit>("mm");
  const [ai, setAi] = useState<AiChoice>({ analyzeNow: true, sendPhotos: true, sendNotes: true });
  const [isCreating, setIsCreating] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  const step = STEPS[stepIndex];
  const hasFiles = Boolean(files.stl) || files.photos.length > 0;
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  useEffect(() => {
    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a browser-only draft after mount
    if (draft) setAnswers(draft);
  }, []);

  // Move focus to each new question so screen readers hear it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

  const goTo = (index: number) => {
    files.setError(null);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  };

  const next = () => {
    const problem = stepError(step, answers, hasFiles);
    if (problem) {
      files.setError(problem);
      return;
    }
    if (step === "review") void create();
    else goTo(stepIndex + 1);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "A") return;
    e.preventDefault();
    next();
  };

  const saveAndExit = () => {
    writeDraft(answers);
    toast({ message: hasFiles ? "Saved. Files aren't kept, so add them again next time." : "Saved. Pick up where you left off any time." });
    router.push("/studio");
  };

  const create = async () => {
    setIsCreating(true);
    files.setError(null);
    const body = new FormData();
    Object.entries(formFields(answers)).forEach(([key, value]) => body.set(key, value));
    body.set("units", units);
    files.appendFiles(body);

    const shownFor = new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS));
    let id: string;
    try {
      const res = await fetch("/api/projects", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ id: string }> | null;
      if (!json?.success) throw new Error(json?.error ?? "Couldn't create the product. Please try again.");
      id = json.data.id;
    } catch (err) {
      setIsCreating(false);
      files.setError(err instanceof Error ? err.message : "Couldn't create the product. Please try again.");
      return;
    }
    writeDraft(null);

    if (ai.analyzeNow) {
      try {
        const inputs = { includePhotos: ai.sendPhotos, includeNotes: ai.sendNotes };
        if (!inputs.includePhotos || !inputs.includeNotes) await postJson(`/api/projects/${id}/versions/1/ai-inputs`, "PUT", inputs);
        await postJson("/api/analyze", "POST", { projectId: id, version: 1 });
      } catch (err) {
        // The product exists either way; the analysis can be run from its page.
        toast({ message: err instanceof Error ? err.message : "The analysis didn't run. You can start it from your product page." });
      }
    }
    await shownFor;
    router.push(`/project/${id}`);
  };

  if (isCreating) {
    const hasCad = Boolean(files.stl);
    const modelUrl = files.stl && !isStep(files.stl.file) ? files.stl.previewUrl : undefined;
    return <CreatingScreen modelUrl={modelUrl} lines={loadingLines({ hasCad, willAnalyze: ai.analyzeNow })} isLong={ai.analyzeNow} />;
  }

  const question = QUESTIONS[step];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-svh flex-col bg-bg" onKeyDown={onKeyDown}>
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between page-pad">
          <Link href="/studio" className="rounded-control" aria-label="Moko home">
            <Logo className="h-5 w-auto" />
          </Link>
          <Button variant="ghost" size="sm" onClick={saveAndExit}>
            Save and exit
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label={`Question ${stepIndex + 1} of ${STEPS.length}`}
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          className="h-1.5 w-full bg-border"
        >
          <div className="h-full rounded-r-pill bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-32 pt-12 sm:pt-16">
        <div className="flex w-full max-w-[560px] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 ref={headingRef} tabIndex={-1} className="type-h1 focus:outline-none">
              {question.title}
            </h1>
            <p className="text-ink-2">{question.helper}</p>
          </div>

          {step === "what" && (
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[14px] font-medium">Name</span>
                <Input autoFocus maxLength={120} value={answers.name} onChange={(e) => set({ name: e.target.value })} placeholder="Fuzz pedal enclosure" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[14px] font-medium">Describe it in a sentence</span>
                <Textarea rows={3} maxLength={4000} value={answers.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What it does, who it's for, what matters most (finish, strength, cost, weight)…" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[14px] font-medium">
                  Material ideas <span className="font-normal text-muted">(optional)</span>
                </span>
                <Input value={answers.materialHints} onChange={(e) => set({ materialHints: e.target.value })} placeholder="aluminum, ABS" />
                <span className="type-small text-muted">Separate them with commas.</span>
              </label>
            </div>
          )}

          {step === "look" && (
            <div className="flex flex-col gap-4">
              <Dropzone
                cad={files.stl}
                photos={files.photos}
                units={units}
                onUnits={setUnits}
                onCad={files.pickStl}
                onPhotos={(picked) => void files.addPhotos(picked)}
                onRemoveCad={files.clearStl}
                onRemovePhoto={files.removePhoto}
                onProblem={files.setError}
              />
              {!hasFiles && (
                <p className="text-ink-2">
                  Don&apos;t have any?{" "}
                  <button type="button" onClick={next} className="font-semibold text-accent-ink hover:underline">
                    Skip
                  </button>
                  , a description is enough.
                </p>
              )}
            </div>
          )}

          {step === "howMany" && <QuantityTiles value={answers.quantity} onChange={(quantity) => set({ quantity })} />}

          {step === "budget" && (
            <div className="flex flex-col gap-3">
              <label className="relative block max-w-64">
                <span className="sr-only">Budget in US dollars</span>
                <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-ink-2">
                  $
                </span>
                <Input autoFocus inputMode="decimal" type="number" min={0} step={1} value={answers.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="5000" className="pl-8 font-mono" />
              </label>
              <button
                type="button"
                onClick={() => {
                  set({ budget: "" });
                  goTo(stepIndex + 1);
                }}
                className="self-start text-[14px] font-semibold text-accent-ink hover:underline"
              >
                Skip
              </button>
            </div>
          )}

          {step === "review" && (
            <>
              <ReviewStep answers={answers} cad={files.stl} units={units} photoCount={files.photos.length} ai={ai} onAi={setAi} onEdit={(s) => goTo(STEPS.indexOf(s))} />
              <Button size="lg" onClick={next} className="w-full">
                Create my product
              </Button>
            </>
          )}

          <FormError message={files.error} />
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-[560px] items-center justify-between px-4 sm:px-0">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
            Back
          </Button>
          {step !== "review" && (
            <Button iconRight={ArrowRight} onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
