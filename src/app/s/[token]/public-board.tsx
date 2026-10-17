"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICES, type ServiceId } from "@/domain/services";
import { Button, focusRing } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmSheet";
import { Header, TopBar } from "@/components/ui/Header";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { DayCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import {
  getCancelToken,
  getClientKey,
  getDisplayName,
  removeCancelToken,
  saveCancelToken,
  setDisplayName,
} from "@/lib/client-identity";
import {
  capitalize,
  formatDay,
  formatDayMonth,
  formatWeekday,
} from "@/lib/format";
import { useBoardRealtime } from "@/lib/use-board-realtime";

type PublicBooking = {
  id: string;
  clientName: string;
  serviceId: string;
  startTime: string;
  endTime: string;
};

type PublicDay = {
  date: string;
  windows: { startTime: string; endTime: string }[];
  availableStarts: string[];
  bookings: PublicBooking[];
};

type PublicBoardData = {
  service: { id: string; durationMinutes: number };
  days: PublicDay[];
};

type Picked = { date: string; startTime: string };

const ERROR_COPY: Record<string, string> = {
  NAME_TAKEN_THAT_DAY:
    "Este nombre ya está apuntado este día. Cambia el nombre.",
  ALREADY_BOOKED_THAT_DAY: "Ya estás apuntado este día. Cancela el tuyo antes.",
  SLOT_TAKEN: "Esa hora ya no está libre. Elige otra.",
  LINK_EXPIRED: "Este enlace ya no está activo.",
  INVALID_NAME: "Pon un nombre de 1 a 40 letras.",
};

const SERVICE_IDS = Object.keys(SERVICES) as ServiceId[];
const SERVICE_ICON: Record<ServiceId, IconName> = {
  corte: "scissors",
  corte_barba: "razor",
};

function shortService(id: string) {
  return id === "corte_barba" ? "Corte + barba" : "Corte";
}

export function PublicBoard({ token }: { token: string }) {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [board, setBoard] = useState<PublicBoardData | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Antes de elegir corte se carga igual (con "corte") para saber si el
  // enlace vale y qué días hay, pero no se pintan horas.
  const load = useCallback(async () => {
    try {
      const data = await api<PublicBoardData>(
        `/api/s/${token}?service=${serviceId ?? "corte"}`,
      );
      setBoard(data);
      setExpired(false);
      setLoadError(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LINK_EXPIRED") {
        setExpired(true);
        setBoard(null);
        return;
      }
      setLoadError(true);
    }
  }, [token, serviceId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useBoardRealtime(load);

  const myBookings =
    board?.days.flatMap((day) =>
      day.bookings
        .filter((booking) => Boolean(getCancelToken(booking.id)))
        .map((booking) => ({ ...booking, date: day.date })),
    ) ?? [];

  async function cancel(booking: PublicBooking & { date: string }) {
    const cancelToken = getCancelToken(booking.id);
    if (!cancelToken) {
      return;
    }
    const ok = await ask({
      title: "¿Liberar tu hueco?",
      body: `${capitalize(formatDay(booking.date))} a las ${booking.startTime}. Otro podrá cogerlo.`,
      confirmLabel: "Liberar",
    });
    if (!ok) {
      return;
    }
    setCancellingId(booking.id);
    try {
      await api(`/api/s/${token}/bookings/${booking.id}`, {
        method: "DELETE",
        body: JSON.stringify({ cancelToken }),
      });
      removeCancelToken(booking.id);
      toast("Hueco liberado");
      await load();
    } catch {
      toast("No se ha podido cancelar.", "warn");
    } finally {
      setCancellingId(null);
    }
  }

  if (expired) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 pb-16">
        <Header />
        <h1 className="mt-2 text-center font-display text-2xl uppercase">
          Enlace caducado
        </h1>
        <p className="mt-2 text-center text-text-dim">
          Este enlace ya no está activo. Pide a Raúl el nuevo por WhatsApp.
        </p>
      </main>
    );
  }

  const stale = Boolean(board && serviceId && board.service.id !== serviceId);
  const noDays = board !== null && board.days.length === 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <TopBar subtitle="Apúntate al corte con Raúl" />

      {noDays ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <Header />
          <p className="font-display text-xl uppercase">Aún no hay días</p>
          <p className="mt-1 text-text-dim">
            Raúl todavía no ha puesto horas. Vuelve a mirar en un rato.
          </p>
        </div>
      ) : serviceId === null ? (
        <section className="pt-6" aria-labelledby="pick-service">
          <StepLabel step={1} total={2} />
          <h1
            id="pick-service"
            className="mt-1 font-display text-3xl uppercase text-text"
          >
            Elige corte
          </h1>
          <p className="mt-1 text-text-dim">
            Luego verás las horas libres de cada día.
          </p>

          <div className="mt-5 grid gap-3">
            {SERVICE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setServiceId(id)}
                className={`group flex min-h-20 items-center gap-4 rounded-2xl border border-brick-edge bg-brick p-4 text-left touch-manipulation transition-[border-color,box-shadow,transform] hover:border-neon-pink/70 hover:shadow-[0_0_18px_rgba(255,45,138,0.25)] active:scale-[0.99] ${focusRing}`}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-neon-pink/40 text-neon-pink">
                  <Icon name={SERVICE_ICON[id]} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">
                    {SERVICES[id].label}
                  </span>
                  <span className="block text-sm text-text-dim">
                    {SERVICES[id].durationMinutes} min
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-2xl text-text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-neon-pink"
                >
                  ›
                </span>
              </button>
            ))}
          </div>

          {board ? (
            <p className="mt-4 text-center text-sm text-text-dim">
              {board.days.length === 1
                ? "Hay 1 día abierto esta semana."
                : `Hay ${board.days.length} días abiertos esta semana.`}
            </p>
          ) : null}

          <MyBookings
            bookings={myBookings}
            cancellingId={cancellingId}
            onCancel={(booking) => void cancel(booking)}
          />
        </section>
      ) : (
        <>
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-night/90 px-4 pt-3 pb-3 backdrop-blur-md">
            <Segmented
              label="Tipo de corte"
              value={serviceId}
              onChange={setServiceId}
              options={SERVICE_IDS.map((id) => ({
                value: id,
                label: SERVICES[id].label,
                hint: `${SERVICES[id].durationMinutes}′`,
              }))}
            />
          </div>

          <MyBookings
            bookings={myBookings}
            cancellingId={cancellingId}
            onCancel={(booking) => void cancel(booking)}
          />

          <div className="mt-2 flex items-baseline justify-between">
            <StepLabel step={2} total={2} />
            <p className="text-xs text-text-dim">Toca una hora libre</p>
          </div>

          {loadError ? (
            <Card className="mt-3 text-center">
              <p className="text-text-dim">No se ha podido cargar la agenda.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => void load()}
              >
                <Icon name="refresh" className="size-4" />
                Reintentar
              </Button>
            </Card>
          ) : null}

          <div
            className={`mt-3 flex flex-col gap-4 transition-opacity ${stale ? "opacity-50" : ""}`}
            aria-busy={stale || !board}
          >
            {!board && !loadError ? (
              <>
                <DayCardSkeleton />
                <DayCardSkeleton />
              </>
            ) : null}
            {board?.days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                disabled={stale}
                hasMine={myBookings.some((booking) => booking.date === day.date)}
                onPick={(startTime) =>
                  setPicked({ date: day.date, startTime })
                }
              />
            ))}
          </div>
        </>
      )}

      {picked && serviceId ? (
        <BookingSheet
          token={token}
          picked={picked}
          serviceId={serviceId}
          onClose={() => setPicked(null)}
          onExpired={() => setExpired(true)}
          onBooked={async () => {
            setPicked(null);
            toast("Estás apuntado");
            await load();
            document
              .getElementById("mi-reserva")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onSlotTaken={() => void load()}
        />
      ) : null}

      {dialog}
    </main>
  );
}

function StepLabel({ step, total }: { step: number; total: number }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-cyan">
      Paso {step} de {total}
    </p>
  );
}

function MyBookings({
  bookings,
  cancellingId,
  onCancel,
}: {
  bookings: (PublicBooking & { date: string })[];
  cancellingId: string | null;
  onCancel: (booking: PublicBooking & { date: string }) => void;
}) {
  if (bookings.length === 0) {
    return null;
  }
  return (
    <section
      id="mi-reserva"
      aria-label="Tu reserva"
      className="mt-5 mb-3 flex scroll-mt-32 flex-col gap-2"
    >
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="animate-flash-lime flex items-center gap-3 rounded-2xl border border-neon-lime/60 bg-brick p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neon-lime/15 text-neon-lime">
            <Icon name="check" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neon-lime">
              Tu reserva
            </p>
            <p className="mt-0.5 truncate font-semibold first-letter:uppercase">
              {formatWeekday(booking.date)} {formatDayMonth(booking.date)}
            </p>
            <p className="truncate text-sm text-text-dim">
              <span className="font-semibold text-text tabular-hours">
                {booking.startTime}–{booking.endTime}
              </span>{" "}
              · {shortService(booking.serviceId)}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            loading={cancellingId === booking.id}
            onClick={() => onCancel(booking)}
          >
            Liberar
          </Button>
        </div>
      ))}
    </section>
  );
}

function DayCard({
  day,
  disabled,
  hasMine,
  onPick,
}: {
  day: PublicDay;
  disabled: boolean;
  hasMine: boolean;
  onPick: (startTime: string) => void;
}) {
  const free = day.availableStarts.length;
  const weekday = formatWeekday(day.date);

  return (
    <section
      id={`dia-${day.date}`}
      aria-labelledby={`dia-${day.date}-t`}
      className="rounded-2xl border border-brick-edge bg-brick p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`dia-${day.date}-t`}
            className="font-display text-2xl uppercase leading-none"
          >
            {weekday}{" "}
            <span className="text-text-dim">{formatDayMonth(day.date)}</span>
          </h2>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-text-dim">
            <Icon name="clock" className="size-3.5" />
            <span className="tabular-hours">
              {day.windows
                .map((window) => `${window.startTime}–${window.endTime}`)
                .join(" · ")}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            hasMine
              ? "border-neon-lime/50 text-neon-lime"
              : free > 0
                ? "border-neon-cyan/50 text-neon-cyan"
                : "border-brick-edge text-text-dim"
          }`}
        >
          {hasMine ? "Apuntado" : free > 0 ? `${free} libres` : "Completo"}
        </span>
      </div>

      {hasMine ? (
        <p className="mt-4 rounded-xl bg-night px-3 py-3 text-sm text-text-dim">
          Ya tienes hora este día. Libera la tuya si quieres otra.
        </p>
      ) : free === 0 ? (
        <p className="mt-4 rounded-xl bg-night px-3 py-3 text-sm text-text-dim">
          No queda hueco para este corte.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 min-[360px]:grid-cols-4">
          {day.availableStarts.map((start) => (
            <button
              key={start}
              type="button"
              disabled={disabled}
              aria-label={`Reservar ${weekday} a las ${start}`}
              onClick={() => onPick(start)}
              className={`min-h-12 rounded-xl border border-neon-cyan/50 bg-neon-cyan/[0.04] text-base font-semibold text-neon-cyan tabular-hours touch-manipulation transition-[background-color,box-shadow,transform] hover:bg-neon-cyan/10 hover:shadow-[0_0_12px_rgba(62,224,255,0.25)] active:scale-95 disabled:opacity-50 ${focusRing}`}
            >
              {start}
            </button>
          ))}
        </div>
      )}

      {day.bookings.length > 0 ? (
        <details className="group mt-4 border-t border-brick-edge pt-3">
          <summary
            className={`-mx-1 flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg px-1 text-sm text-text-dim touch-manipulation [&::-webkit-details-marker]:hidden ${focusRing}`}
          >
            <span>
              {day.bookings.length === 1
                ? "1 apuntado"
                : `${day.bookings.length} apuntados`}
            </span>
            <span
              aria-hidden
              className="text-lg transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <ul className="mt-1 divide-y divide-brick-edge/60">
            {day.bookings.map((booking) => {
              const mine = Boolean(getCancelToken(booking.id));
              return (
                <li
                  key={booking.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <span className="w-[5.5rem] shrink-0 tabular-hours text-text-dim">
                    {booking.startTime}–{booking.endTime}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text">
                    {booking.clientName}
                  </span>
                  {mine ? (
                    <span className="rounded-full bg-neon-lime/15 px-2 py-0.5 text-xs font-semibold text-neon-lime">
                      Tú
                    </span>
                  ) : (
                    <span className="text-xs text-text-dim">
                      {shortService(booking.serviceId)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function BookingSheet({
  token,
  picked,
  serviceId,
  onClose,
  onBooked,
  onExpired,
  onSlotTaken,
}: {
  token: string;
  picked: Picked;
  serviceId: ServiceId;
  onClose: () => void;
  onBooked: () => Promise<void>;
  onExpired: () => void;
  onSlotTaken: () => void;
}) {
  const [name, setName] = useState(() => getDisplayName());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const service = SERVICES[serviceId];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(ERROR_COPY.INVALID_NAME);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = await api<{
        booking: PublicBooking & { date: string };
        cancelToken: string;
      }>(`/api/s/${token}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          date: picked.date,
          startTime: picked.startTime,
          name: name.trim(),
          clientKey: getClientKey(),
        }),
      });
      saveCancelToken(data.booking.id, data.cancelToken);
      setDisplayName(name.trim());
      setDone(true);
      navigator.vibrate?.(15);
      setTimeout(() => void onBooked(), 900);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "INTERNAL_ERROR";
      if (code === "LINK_EXPIRED") {
        onExpired();
        return;
      }
      if (code === "SLOT_TAKEN") {
        onSlotTaken();
      }
      setError(ERROR_COPY[code] ?? "No se ha podido apuntar.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Sheet ariaLabel="Reserva hecha" onClose={() => void onBooked()}>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="animate-flash-lime flex size-16 items-center justify-center rounded-full bg-neon-lime text-on-neon">
            <Icon name="check" className="size-8" />
          </span>
          <p className="mt-4 font-display text-2xl uppercase text-neon-lime">
            Estás apuntado
          </p>
          <p className="mt-1 text-text-dim first-letter:uppercase">
            {formatDay(picked.date)} ·{" "}
            <span className="tabular-hours">{picked.startTime}</span>
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Apúntate"
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      footer={
        <Button
          type="submit"
          form="booking-form"
          className="w-full"
          loading={busy}
        >
          Apúntate a las {picked.startTime}
        </Button>
      }
    >
      <div className="flex items-center gap-4 rounded-2xl bg-night p-4">
        <div className="text-center">
          <p className="font-display text-4xl leading-none tabular-hours text-text">
            {picked.startTime}
          </p>
          <p className="mt-1 text-xs text-text-dim">{service.durationMinutes} min</p>
        </div>
        <div className="min-w-0 border-l border-brick-edge pl-4">
          <p className="font-semibold first-letter:uppercase">
            {formatDay(picked.date)}
          </p>
          <p className="text-sm text-text-dim">{service.label}</p>
        </div>
      </div>

      <form id="booking-form" className="mt-5" onSubmit={submit} noValidate>
        <label className="block text-sm text-text-dim" htmlFor="booking-name">
          Tu nombre
        </label>
        <Input
          id="booking-name"
          className="mt-1.5"
          value={name}
          maxLength={40}
          autoFocus
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "booking-error" : "booking-help"}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder="Cómo te conocemos"
        />
        {error ? (
          <p
            id="booking-error"
            role="alert"
            className="mt-2 text-sm text-neon-orange"
          >
            {error}
          </p>
        ) : (
          <p id="booking-help" className="mt-2 text-xs text-text-dim">
            Lo verán los demás. Solo tú podrás liberar este hueco desde este
            móvil.
          </p>
        )}
      </form>
    </Sheet>
  );
}
