"use client";

import { useParams } from "next/navigation";
import { PublicBoard } from "./public-board";

export function PublicPageClient() {
  const params = useParams<{ token: string }>();
  if (!params.token) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-text-dim">
        Cargando…
      </main>
    );
  }
  return <PublicBoard token={params.token} />;
}
