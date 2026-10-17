"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
};

/**
 * Sustituto de `confirm()`: `await ask({...})` devuelve true/false.
 * Renderiza `dialog` donde quieras dentro del árbol.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = options ? (
    <Sheet
      title={options.title}
      onClose={() => settle(false)}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" autoFocus onClick={() => settle(false)}>
            {options.cancelLabel ?? "Volver"}
          </Button>
          <Button variant="danger" onClick={() => settle(true)}>
            {options.confirmLabel}
          </Button>
        </div>
      }
    >
      {options.body ? (
        <p className="text-base text-text-dim">{options.body}</p>
      ) : null}
    </Sheet>
  ) : null;

  return { ask, dialog };
}
