"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { Icon } from "./Icon";

// Pila de sheets abiertos: solo el de arriba responde a Escape / Tab.
const stack: symbol[] = [];

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Bottom sheet en móvil, diálogo centrado desde `sm`. */
export function Sheet({
  title,
  ariaLabel,
  header,
  footer,
  onClose,
  className = "",
  children,
}: {
  title?: string;
  ariaLabel?: string;
  header?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  // Se lee al renderizar, antes de que `autoFocus` mueva el foco dentro de la
  // hoja: así al cerrar se vuelve al botón que la abrió.
  const [opener] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const self = Symbol("sheet");
    stack.push(self);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const autofocus = panel.querySelector<HTMLElement>("[autofocus]");
      (autofocus ?? panel).focus();
    }

    function onKey(event: KeyboardEvent) {
      if (stack[stack.length - 1] !== self) {
        return;
      }
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      stack.splice(stack.indexOf(self), 1);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, [opener]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-night/80 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={`animate-sheet-up relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-sheet border border-b-0 border-brick-edge bg-brick outline-none sm:rounded-sheet sm:border-b ${className}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-brick-edge sm:hidden" />
        {header ??
          (title ? (
            <div className="flex shrink-0 items-center justify-between gap-2 py-1 pr-2 pl-5">
              <h2
                id={titleId}
                className="text-lg font-semibold text-text"
              >
                {title}
              </h2>
              <IconButton label="Cerrar" onClick={onClose}>
                <Icon name="close" />
              </IconButton>
            </div>
          ) : null)}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-2">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="h-[max(1rem,env(safe-area-inset-bottom))] shrink-0" />
        )}
      </div>
    </div>,
    document.body,
  );
}
