import { Header } from "@/components/ui/Header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 pb-16 text-center">
      <Header />
      <h1 className="mt-2 font-display text-2xl uppercase">Reservas con Raúl</h1>
      <p className="mt-2 text-text-dim">
        Abre el enlace que Raúl ha pasado por WhatsApp. Sin ese enlace no se
        puede reservar.
      </p>
    </main>
  );
}
