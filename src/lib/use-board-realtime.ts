"use client";

import { useEffect } from "react";
import { createBrowserSupabase } from "./supabase-browser";

export function useBoardRealtime(onChange: () => void) {
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const refresh = () => onChange();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    if (!supabase) {
      return () => document.removeEventListener("visibilitychange", onVisible);
    }

    const channel = supabase
      .channel("ortiz-week-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "week_board" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_pulse" },
        refresh,
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [onChange]);
}
