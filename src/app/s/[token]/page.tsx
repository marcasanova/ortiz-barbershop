import { Suspense } from "react";
import { PublicPageClient } from "./public-page-client";

export default function PublicPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-10 text-text-dim">
          Cargando…
        </main>
      }
    >
      <PublicPageClient />
    </Suspense>
  );
}
