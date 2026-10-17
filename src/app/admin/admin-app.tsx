"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Appear } from "@/components/ui/Appear";
import { Button, IconButton, focusRing } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmSheet";
import { DatePicker } from "@/components/ui/DatePicker";
import { Header, TopBar } from "@/components/ui/Header";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { DayCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { TimePicker } from "@/components/ui/TimePicker";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import {
  capitalize,
  formatDay,
  formatDayMonth,
  formatDayShort,
  formatWeekday,
} from "@/lib/format";
import { useBoardRealtime } from "@/lib/use-board-realtime";

type WindowRow = { startTime: string; endTime: string };

type AdminBooking = {
  id: string;
  clientName: string;
  serviceId: string;
  startTime: string;
  endTime: string;
};

type AdminDay = {
  date: string;
  windows: { id: string; startTime: string; endTime: string }[];
  bookings: AdminBooking[];
};

type AdminWeek = {
  id: string;
  isActive: boolean;
  hasPublicToken: boolean;
  days: AdminDay[];
};

type Ask = ReturnType<typeof useConfirm>["ask"];

function shortService(id: string) {
  return id === "corte_barba" ? "Corte + barba" : "Corte";
}

function windowsError(windows: WindowRow[]): string {
  if (windows.length === 0) {
    return "Pon al menos una franja.";
  }
  if (windows.some((window) => !window.startTime || !window.endTime)) {
    return "Rellena las horas.";
  }
  if (windows.some((window) => window.endTime <= window.startTime)) {
    return "La hora de fin tiene que ser después de la de inicio.";
  }
  const sorted = [...windows].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return "Hay franjas que se pisan.";
    }
  }
  return "";
}

function bookingsOutside(bookings: AdminBooking[], windows: WindowRow[]) {
  return bookings.filter(
    (booking) =>
      !windows.some(
        (window) =>
          booking.startTime >= window.startTime &&
          booking.endTime <= window.endTime,
      ),
  );
}

export function AdminApp() {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [week, setWeek] = useState<AdminWeek | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<AdminWeek>("/api/admin/week");
      setWeek(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setWeek(null);
      } else if (error instanceof ApiError && error.status === 401) {
        setAuthed(false);
      }
    }

    try {
      const data = await api<{ url: string }>("/api/admin/link");
      setLink(data.url);
    } catch {
      setLink(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await api("/api/admin/session");
        setAuthed(true);
        await load();
      } catch {
        setAuthed(false);
      } finally {
        setReady(true);
      }
    })();
  }, [load]);

  useBoardRealtime(load);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setWeek(null);
  }

  async function createWeek() {
    setCreating(true);
    try {
      await api("/api/admin/week", { method: "POST" });
      await load();
    } catch {
      toast("No se ha podido crear la semana.", "warn");
    } finally {
      setCreating(false);
    }
  }

  async function saveDay(date: string, windows: WindowRow[]) {
    try {
      await api("/api/admin/week/days", {
        method: "PUT",
        body: JSON.stringify({ date, windows }),
      });
      await load();
      toast("Guardado");
      return true;
    } catch {
      toast("No se ha podido guardar.", "warn");
      return false;
    }
  }

  async function removeDay(day: AdminDay) {
    const ok = await ask({
      title: "¿Quitar este día?",
      body:
        day.bookings.length > 0
          ? `${capitalize(formatDay(day.date))}. Se cancelan ${day.bookings.length === 1 ? "la reserva" : `las ${day.bookings.length} reservas`} de ese día.`
          : `${capitalize(formatDay(day.date))}. No hay nadie apuntado.`,
      confirmLabel: "Quitar día",
    });
    if (!ok) {
      return;
    }
    try {
      await api(`/api/admin/week/days?date=${day.date}`, { method: "DELETE" });
      await load();
      toast("Día quitado");
    } catch {
      toast("No se ha podido quitar el día.", "warn");
    }
  }

  async function cancelBooking(booking: AdminBooking) {
    const ok = await ask({
      title: "¿Cancelar reserva?",
      body: `${booking.clientName} a las ${booking.startTime}. El hueco queda libre.`,
      confirmLabel: "Cancelar reserva",
      cancelLabel: "Volver",
    });
    if (!ok) {
      return;
    }
    try {
      await api(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
      await load();
      toast("Reserva cancelada");
    } catch {
      toast("No se ha podido cancelar.", "warn");
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4">
        <TopBar subtitle="Panel de Raúl" />
        <Skeleton className="h-36 rounded-2xl" />
        <DayCardSkeleton />
      </main>
    );
  }

  if (!authed) {
    return (
      <LoginScreen
        onLoggedIn={async () => {
          setAuthed(true);
          await load();
        }}
      />
    );
  }

  const totalBookings =
    week?.days.reduce((sum, day) => sum + day.bookings.length, 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <TopBar
        subtitle="Panel de Raúl"
        action={
          <IconButton label="Salir" onClick={() => void logout()}>
            <Icon name="logout" />
          </IconButton>
        }
      />

      <Appear>
        <LinkCard
          link={link}
          canGenerate={Boolean(week)}
          ask={ask}
          onGenerated={async (url) => {
            setLink(url);
            await load();
          }}
        />
      </Appear>

      {!week ? (
        <Appear delayMs={60}>
          <Card className="text-center">
            <p className="font-display text-xl uppercase">Sin semana</p>
            <p className="mt-1 text-text-dim">
              Crea la semana y luego añade los días que cortas.
            </p>
            <Button
              className="mt-4 w-full"
              loading={creating}
              onClick={() => void createWeek()}
            >
              Crear semana
            </Button>
          </Card>
        </Appear>
      ) : (
        <>
          <Appear delayMs={60}>
          <section aria-labelledby="week-title">
            <div className="flex items-baseline justify-between">
              <h1
                id="week-title"
                className="font-display text-2xl uppercase"
              >
                Semana
              </h1>
              <p className="text-sm text-text-dim">
                {totalBookings === 1
                  ? "1 reserva"
                  : `${totalBookings} reservas`}
              </p>
            </div>
            {week.days.length > 0 ? (
              <nav
                aria-label="Ir al día"
                className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
              >
                {week.days.map((day) => (
                  <a
                    key={day.date}
                    href={`#dia-${day.date}`}
                    className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-brick-edge bg-brick px-3.5 text-sm touch-manipulation hover:border-mortar ${focusRing}`}
                  >
                    <span className="capitalize">{formatDayShort(day.date)}</span>
                    <span
                      className={`rounded-full px-1.5 text-xs font-semibold tabular-hours ${
                        day.bookings.length > 0
                          ? "bg-neon-cyan/15 text-neon-cyan"
                          : "text-text-dim"
                      }`}
                    >
                      {day.bookings.length}
                    </span>
                  </a>
                ))}
              </nav>
            ) : (
              <Card className="mt-3 text-center text-text-dim">
                No hay días todavía. Pulsa{" "}
                <span className="text-text">Añadir día</span> abajo.
              </Card>
            )}
          </section>
          </Appear>

          {week.days.map((day, index) => (
            <Appear key={day.date} delayMs={120 + index * 60}>
              <DayEditor
                day={day}
                onSave={saveDay}
                onRemove={() => void removeDay(day)}
                onCancelBooking={(booking) => void cancelBooking(booking)}
              />
            </Appear>
          ))}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brick-edge/70 bg-night/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <div className="mx-auto max-w-lg">
              <Button className="w-full" onClick={() => setAddOpen(true)}>
                <Icon name="plus" />
                Añadir día
              </Button>
            </div>
          </div>

          {addOpen ? (
            <AddDaySheet
              takenDates={week.days.map((day) => day.date)}
              onClose={() => setAddOpen(false)}
              onSave={async (date, windows) => {
                const ok = await saveDay(date, windows);
                if (ok) {
                  setAddOpen(false);
                }
              }}
            />
          ) : null}
        </>
      )}

      {dialog}
    </main>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      setPin("");
      await onLoggedIn();
    } catch {
      setError("PIN incorrecto. Prueba otra vez.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
      <Appear>
        <Header compact />
        <h1 className="mt-2 text-center font-display text-2xl uppercase">
          Entrar
        </h1>
        <p className="mt-1 text-center text-sm text-text-dim">
          Solo Raúl. Escribe el PIN.
        </p>
      </Appear>
      <Appear delayMs={80}>
      <form className="mt-6 flex flex-col gap-3" onSubmit={login}>
        <label htmlFor="pin" className="sr-only">
          PIN
        </label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="current-password"
          enterKeyHint="go"
          autoFocus
          value={pin}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "pin-error" : undefined}
          onChange={(event) => {
            setPin(event.target.value);
            setError("");
          }}
          placeholder="••••"
          className="text-center text-2xl tracking-[0.5em]"
        />
        {error ? (
          <p id="pin-error" role="alert" className="text-center text-sm text-neon-orange">
            {error}
          </p>
        ) : null}
        <Button className="w-full" type="submit" loading={busy} disabled={!pin}>
          Entrar
        </Button>
      </form>
      </Appear>
    </main>
  );
}

function LinkCard({
  link,
  canGenerate,
  ask,
  onGenerated,
}: {
  link: string | null;
  canGenerate: boolean;
  ask: Ask;
  onGenerated: (url: string) => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (link) {
      const ok = await ask({
        title: "¿Enlace nuevo?",
        body: "El enlace que ya mandaste por WhatsApp deja de valer. Tendrás que enviar el nuevo.",
        confirmLabel: "Generar nuevo",
      });
      if (!ok) {
        return;
      }
    }
    setBusy(true);
    try {
      const data = await api<{ url: string }>("/api/admin/link", {
        method: "POST",
      });
      await onGenerated(data.url);
      toast("Enlace listo");
    } catch {
      toast("No se ha podido generar.", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast("Copiado");
    } catch {
      toast("No se ha podido copiar.", "warn");
    }
  }

  async function share() {
    if (!link) {
      return;
    }
    const text = "Apúntate al corte con Raúl";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ortiz Barbershop", text, url: link });
      } catch {
        // Cancelado por el usuario.
      }
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text}: ${link}`)}`,
      "_blank",
      "noopener",
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg uppercase">Enlace</h2>
        {link ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neon-lime">
            <span className="size-2 rounded-full bg-neon-lime shadow-[0_0_8px_rgba(200,255,58,0.8)]" />
            Activo
          </span>
        ) : null}
      </div>

      {link ? (
        <>
          <div className="mt-3 flex items-center gap-1 rounded-xl border border-brick-edge bg-night pl-3">
            <p className="min-w-0 flex-1 truncate text-sm text-neon-cyan">
              {link.replace(/^https?:\/\//, "")}
            </p>
            <IconButton label="Copiar enlace" onClick={() => void copy()}>
              <Icon name="copy" />
            </IconButton>
          </div>
          <Button className="mt-3 w-full" onClick={() => void share()}>
            <Icon name="share" />
            Compartir por WhatsApp
          </Button>
          <button
            type="button"
            disabled={busy || !canGenerate}
            onClick={() => void generate()}
            className={`mt-2 min-h-11 w-full rounded-xl text-sm text-neon-orange touch-manipulation hover:bg-neon-orange/10 disabled:opacity-50 ${focusRing}`}
          >
            {busy ? "Generando…" : "Generar enlace nuevo"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-text-dim">
            Aún no hay enlace. Genera uno y mándalo al grupo. Editar días luego
            no lo cambia.
          </p>
          <Button
            className="mt-3 w-full"
            loading={busy}
            disabled={!canGenerate}
            onClick={() => void generate()}
          >
            Generar enlace
          </Button>
        </>
      )}
    </Card>
  );
}

function DayEditor({
  day,
  onSave,
  onRemove,
  onCancelBooking,
}: {
  day: AdminDay;
  onSave: (date: string, windows: WindowRow[]) => Promise<boolean>;
  onRemove: () => void;
  onCancelBooking: (booking: AdminBooking) => void;
}) {
  // Clave por contenido: un refresco en tiempo real con las mismas franjas
  // no pisa lo que Raúl está editando.
  const originalKey = JSON.stringify(
    day.windows.map(({ startTime, endTime }) => ({ startTime, endTime })),
  );
  const original = useMemo(
    () => JSON.parse(originalKey) as WindowRow[],
    [originalKey],
  );
  const [windows, setWindows] = useState<WindowRow[]>(original);
  const [baseKey, setBaseKey] = useState(originalKey);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (baseKey !== originalKey) {
    setBaseKey(originalKey);
    setWindows(original);
  }

  const dirty = JSON.stringify(windows) !== originalKey;
  const error = dirty ? windowsError(windows) : "";
  const lost = dirty && !error ? bookingsOutside(day.bookings, windows) : [];

  function update(index: number, patch: Partial<WindowRow>) {
    setWindows(
      windows.map((window, i) => (i === index ? { ...window, ...patch } : window)),
    );
  }

  async function save() {
    setSaving(true);
    await onSave(day.date, windows);
    setSaving(false);
  }

  return (
    <section
      id={`dia-${day.date}`}
      aria-labelledby={`dia-${day.date}-t`}
      className="scroll-mt-20 rounded-2xl border border-brick-edge bg-brick p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id={`dia-${day.date}-t`}
            className="font-display text-2xl uppercase leading-none"
          >
            {formatWeekday(day.date)}{" "}
            <span className="text-text-dim">{formatDayMonth(day.date)}</span>
          </h2>
          <p className="mt-1.5 text-xs text-text-dim">
            {day.bookings.length === 0
              ? "Nadie apuntado"
              : day.bookings.length === 1
                ? "1 apuntado"
                : `${day.bookings.length} apuntados`}
          </p>
        </div>
        <IconButton
          label="Opciones del día"
          className="-mt-1 -mr-2"
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="more" />
        </IconButton>
      </div>

      {day.bookings.length > 0 ? (
        <ul className="mt-3 divide-y divide-brick-edge/60 rounded-xl bg-night px-3">
          {day.bookings.map((booking) => (
            <li key={booking.id} className="flex items-center gap-3 py-1.5">
              <span className="w-[5.5rem] shrink-0 text-sm tabular-hours text-text-dim">
                {booking.startTime}–{booking.endTime}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {booking.clientName}
                </span>
                <span className="block text-xs text-text-dim">
                  {shortService(booking.serviceId)}
                </span>
              </span>
              <IconButton
                label={`Cancelar reserva de ${booking.clientName}`}
                className="-mr-2 text-neon-orange/80 hover:text-neon-orange"
                onClick={() => onCancelBooking(booking)}
              >
                <Icon name="trash" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-dim">
        Franjas
      </h3>
      <div className="mt-2 space-y-2">
        {windows.map((window, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          >
            <TimePicker
              label="Desde"
              value={window.startTime}
              onChange={(startTime) => update(index, { startTime })}
            />
            <TimePicker
              label="Hasta"
              value={window.endTime}
              onChange={(endTime) => update(index, { endTime })}
            />
            <IconButton
              label="Quitar franja"
              className="mb-0.5"
              disabled={windows.length === 1}
              onClick={() => setWindows(windows.filter((_, i) => i !== index))}
            >
              <Icon name="close" />
            </IconButton>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          type="button"
          onClick={() => {
            const last = windows[windows.length - 1];
            setWindows([
              ...windows,
              { startTime: last?.endTime ?? "16:00", endTime: "20:00" },
            ]);
          }}
        >
          <Icon name="plus" className="size-4" />
          Añadir franja (tras un descanso)
        </Button>
      </div>

      {dirty ? (
        <div className="animate-fade-in mt-3 rounded-xl border border-neon-pink/40 bg-night p-3">
          {error ? (
            <p role="alert" className="text-sm text-neon-orange">
              {error}
            </p>
          ) : lost.length > 0 ? (
            <p className="text-sm text-neon-orange">
              {lost.length === 1
                ? "Se cancelará 1 reserva que queda fuera"
                : `Se cancelarán ${lost.length} reservas que quedan fuera`}
              : {lost.map((booking) => booking.clientName).join(", ")}.
            </p>
          ) : (
            <p className="text-sm text-text-dim">Cambios sin guardar.</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => setWindows(original)}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              loading={saving}
              disabled={Boolean(error)}
              onClick={() => void save()}
            >
              Guardar
            </Button>
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <Sheet
          title={formatDay(day.date)}
          onClose={() => setMenuOpen(false)}
        >
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              setMenuOpen(false);
              onRemove();
            }}
          >
            <Icon name="trash" />
            Quitar día
          </Button>
          <p className="mt-2 text-center text-xs text-text-dim">
            Se cancelan las reservas de ese día.
          </p>
        </Sheet>
      ) : null}
    </section>
  );
}

function AddDaySheet({
  takenDates,
  onClose,
  onSave,
}: {
  takenDates: string[];
  onClose: () => void;
  onSave: (date: string, windows: WindowRow[]) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("20:00");
  const [saving, setSaving] = useState(false);
  const error = windowsError([{ startTime: start, endTime: end }]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date || error) {
      return;
    }
    setSaving(true);
    await onSave(date, [{ startTime: start, endTime: end }]);
    setSaving(false);
  }

  return (
    <Sheet
      title="Añadir día"
      onClose={() => {
        if (!saving) {
          onClose();
        }
      }}
      footer={
        <Button
          type="submit"
          form="add-day-form"
          className="w-full"
          loading={saving}
          disabled={!date || Boolean(error)}
        >
          Guardar día
        </Button>
      }
    >
      <form
        id="add-day-form"
        className="flex flex-col gap-4 pt-1"
        onSubmit={submit}
      >
        <DatePicker value={date} onChange={setDate} disabledDates={takenDates} />
        <div className="grid grid-cols-2 gap-2">
          <TimePicker label="Desde" value={start} onChange={setStart} />
          <TimePicker label="Hasta" value={end} onChange={setEnd} />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-neon-orange">
            {error}
          </p>
        ) : (
          <p className="text-xs text-text-dim">
            Si hay descanso, añade otra franja después desde la card del día.
          </p>
        )}
      </form>
    </Sheet>
  );
}
