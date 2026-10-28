"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";

type Tone = "success" | "warn";
type ToastState = { id: number; text: string; tone: Tone } | null;

const ToastContext = createContext<(text: string, tone?: Tone) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, tone: Tone = "success") => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setToast({ id: Date.now(), text, tone });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toast ? (
          <div
            key={toast.id}
            className={`animate-toast-in pointer-events-auto mb-20 flex max-w-sm items-center gap-2 rounded-full border bg-brick px-4 py-3 text-sm font-semibold ${
              toast.tone === "success"
                ? "border-neon-lime/60 text-neon-lime"
                : "border-neon-orange/60 text-neon-orange"
            }`}
          >
            <Icon
              name={toast.tone === "success" ? "check" : "close"}
              className="size-4 shrink-0"
            />
            {toast.text}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
