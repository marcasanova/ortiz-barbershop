import { Header } from "@/components/ui/Header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 pb-16 text-center">
      <Header />
      <h1 className="mt-4 text-xl font-semibold">Para reservar, abre tu enlace</h1>
      <p className="mx-auto mt-2 max-w-[32ch] text-text-dim">
        Raúl lo pasa cada semana por el grupo de WhatsApp. Sin ese enlace no se
        pueden ver las horas.
      </p>
    </main>
  );
}
