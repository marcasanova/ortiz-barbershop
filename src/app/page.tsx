import { Header } from "@/components/ui/Header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col">
      <Header />
      <p className="px-6 pb-10 text-center text-text-dim">
        Si Raúl te ha pasado el enlace, ábrelo desde WhatsApp. No hay reserva
        sin ese enlace.
      </p>
    </main>
  );
}
