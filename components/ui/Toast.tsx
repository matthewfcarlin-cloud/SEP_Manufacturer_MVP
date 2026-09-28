"use client";

import { CheckCircle2, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TOAST_MS } from "./tokens";

type ToastInput = { message: string; icon?: LucideIcon };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Show a toast: bottom-center, ink on white, 3s. "Quote chosen", "Copied". */
export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const nextId = useRef(0);

  const show = useCallback((input: ToastInput) => {
    nextId.current += 1;
    setToast({ ...input, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => show, [show]);
  const Icon = toast?.icon ?? CheckCircle2;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[100] lg:bottom-6 print:hidden">
        {toast && (
          <div
            key={toast.id}
            className="absolute bottom-0 left-1/2 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[12px] bg-ink px-4 py-3 text-[14px] font-medium text-bg shadow-pop motion-safe:animate-[toast-in_160ms_cubic-bezier(.2,.8,.2,1)]"
          >
            <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
