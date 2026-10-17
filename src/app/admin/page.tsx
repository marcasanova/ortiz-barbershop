import { Suspense } from "react";
import { AdminApp } from "./admin-app";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-10 text-text-dim">
          Cargando…
        </main>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
