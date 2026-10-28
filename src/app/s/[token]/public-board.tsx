"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SERVICES, type ServiceId } from "@/domain/services";
import { Button, focusRing } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmSheet";
import { Header, TopBar } from "@/components/ui/Header";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Rail } from "@/components/ui/Rail";
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
  removeRequestToken,
  saveCancelToken,
  setDisplayName,
  takeRequestToken,
} from "@/lib/client-identity";
import {
  capitalize,
  durationText,
  formatDayNumber,
  serviceName,
  formatDay,
  formatWeekday,
} from "@/lib/format";
import { buildDaySlots, type PublicBooking } from "@/lib/day-slots";
import { outgoingNotices, requestState } from "@/lib/swap-requests";
import { useBoardRealtime } from "@/lib/use-board-realtime";
import type { IncomingRequest, OutgoingRequest } from "@/server/swap-requests";
import {
  IncomingRequests,
  OutgoingRequests,
  REQUEST_ERROR_COPY,
  RequestSheet,
  type MySwapRequests,
} from "./swap-requests-ui";

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
type RequestTarget = { date: string; booking: PublicBooking };

const ERROR_COPY: Record<string, string> = {
  NAME_TAKEN_THAT_DAY:
    "Este nombre ya está apuntado este día. Cambia el nombre.",
  ALREADY_BOOKED_THAT_DAY: "Ya estás apuntado este día. Cancela el tuyo antes.",
  SLOT_TAKEN: "Esa hora ya no está libre. Elige otra.",
  LINK_EXPIRED: "Este enlace ya no está activo.",
  INVALID_NAME: "Pon un nombre de 1 a 40 letras.",
};

const SERVICE_IDS = Object.keys(SERVICES) as ServiceId[];
// Cada servicio tiene un único acento neón (branding §3: uno por bloque).
const SERVICE_STYLE: Record<
  ServiceId,
  { art: string; icon: IconName; card: string; arrow: string }
> = {
  corte: {
    art: "/brand/servicios/corte.svg",
    icon: "scissors",
    card: "hover:border-neon-lime/60 hover:shadow-[0_0_22px_rgba(200,255,58,0.18)] focus-visible:border-neon-lime/60",
    arrow: "group-hover:text-neon-lime",
  },
  corte_barba: {
    art: "/brand/servicios/corte-vintage.svg",
    icon: "av",
    card: "hover:border-neon-cyan/60 hover:shadow-[0_0_22px_rgba(62,224,255,0.18)] focus-visible:border-neon-cyan/60",
    arrow: "group-hover:text-neon-cyan",
  },
};


export function PublicBoard({ token }: { token: string }) {
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [board, setBoard] = useState<PublicBoardData | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MySwapRequests>({ incoming: [], outgoing: [] });
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  // Estado anterior de las peticiones enviadas, para avisar solo de cambios.
  const outgoingSeen = useRef<Record<string, OutgoingRequest["status"]> | null>(null);

  // Peticiones de este navegador. Si fallan, el tablero sigue funcionando.
  const loadRequests = useCallback(async () => {
    try {
      const mine = await api<MySwapRequests>(`/api/s/${token}/requests/mine`, {
        method: "POST",
        body: JSON.stringify({ clientKey: getClientKey() }),
      });

      for (const request of mine.outgoing) {
        if (request.status === "accepted" && request.resultBookingId) {
          // Al ceder nace una reserva nueva: su token es el de la petición.
          takeRequestToken(request.id, request.resultBookingId);
        } else if (request.status !== "pending") {
          removeRequestToken(request.id);
        }
      }

      for (const notice of outgoingNotices(outgoingSeen.current, mine.outgoing)) {
        toast(notice.message, notice.tone);
      }
      outgoingSeen.current = Object.fromEntries(
        mine.outgoing.map((request) => [request.id, request.status]),
      );
      setRequests(mine);
    } catch {
      // Sin peticiones no se rompe nada: se reintenta en la siguiente carga.
    }
  }, [token, toast]);

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
      await loadRequests();
    } catch (error) {
      if (error instanceof ApiError && error.code === "LINK_EXPIRED") {
        setExpired(true);
        setBoard(null);
        return;
      }
      setLoadError(true);
    }
  }, [token, serviceId, loadRequests]);

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

  async function answer(request: IncomingRequest, accept: boolean) {
    const cancelToken = request.targetBookingId
      ? getCancelToken(request.targetBookingId)
      : undefined;
    if (!cancelToken) {
      toast("Esta hora no es tuya en este móvil.", "warn");
      return;
    }

    if (accept) {
      const ok = await ask(
        request.swapStartTime
          ? {
              title: "¿Cambiar la hora?",
              body: `Tú pasas a las ${request.swapStartTime} y ${request.requesterName} a las ${request.startTime}.`,
              confirmLabel: "Cambiar",
            }
          : {
              title: `¿Darle tus ${request.startTime}?`,
              body: `Te quedas sin hora ese día. Si quieres otra, tendrás que elegirla tú en el tablero.`,
              confirmLabel: "Dársela",
            },
      );
      if (!ok) {
        return;
      }
    }

    setAnsweringId(request.id);
    try {
      await api(`/api/s/${token}/requests/${request.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ cancelToken, accept }),
      });
      if (accept && !request.swapStartTime && request.targetBookingId) {
        removeCancelToken(request.targetBookingId);
      }
      toast(
        !accept
          ? `Le has dicho que no a ${request.requesterName}`
          : request.swapStartTime
            ? `Hecho: ahora vas a las ${request.swapStartTime}`
            : `Le has dado tus ${request.startTime} a ${request.requesterName}. Si quieres otra hora, elígela en el tablero.`,
      );
      await load();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "INTERNAL_ERROR";
      toast(REQUEST_ERROR_COPY[code] ?? "No se ha podido responder.", "warn");
      await load();
    } finally {
      setAnsweringId(null);
    }
  }

  async function withdraw(request: OutgoingRequest) {
    setAnsweringId(request.id);
    try {
      await api(`/api/s/${token}/requests/${request.id}`, {
        method: "DELETE",
        body: JSON.stringify({ clientKey: getClientKey() }),
      });
      removeRequestToken(request.id);
      toast("Petición retirada");
      await load();
    } catch {
      toast("No se ha podido retirar.", "warn");
    } finally {
      setAnsweringId(null);
    }
  }

  const pendingTargetIds = requests.outgoing
    .filter((request) => request.status === "pending" && request.targetBookingId)
    .map((request) => request.targetBookingId as string);

  const requestBlocks = (
    <>
      <IncomingRequests
        requests={requests.incoming}
        busyId={answeringId}
        onAnswer={(request, accept) => void answer(request, accept)}
      />
      <OutgoingRequests
        requests={requests.outgoing}
        busyId={answeringId}
        onWithdraw={(request) => void withdraw(request)}
      />
    </>
  );

  if (expired) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 pb-16">
        <Header />
        <h1 className="mt-4 text-center text-xl font-semibold">
          Este enlace ya no vale
        </h1>
        <p className="mx-auto mt-2 max-w-[30ch] text-center text-text-dim">
          Raúl ha abierto una semana nueva. Pídele el enlace nuevo por WhatsApp.
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
          <p className="mt-4 text-xl font-semibold">Todavía no hay horas</p>
          <p className="mx-auto mt-2 max-w-[30ch] text-text-dim">
            Raúl aún no ha abierto días esta semana. Vuelve a mirar en un rato.
          </p>
        </div>
      ) : serviceId === null ? (
        <section className="pt-3" aria-labelledby="pick-service">
          {/* Lo que espera respuesta va antes que elegir un corte nuevo. */}
          {requestBlocks}
          <MyBookings
            bookings={myBookings}
            cancellingId={cancellingId}
            onCancel={(booking) => void cancel(booking)}
          />
          <h1
            id="pick-service"
            className="mt-5 font-display text-[40px] uppercase text-text"
          >
            Elige tu corte
          </h1>
          <p className="mt-2 max-w-[34ch] text-text-dim">
            Después verás las horas libres de cada día y quién va.
          </p>

          <div className="mt-6 grid gap-3">
            {SERVICE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setServiceId(id)}
                className={`group flex w-full items-center gap-4 rounded-panel border border-brick-edge bg-brick p-3 pr-4 text-left touch-manipulation transition-[border-color,box-shadow,transform] active:scale-[0.99] ${focusRing} ${SERVICE_STYLE[id].card}`}
              >
                <Image
                  src={SERVICE_STYLE[id].art}
                  alt=""
                  width={88}
                  height={88}
                  unoptimized
                  priority
                  className="size-[88px] shrink-0 rounded-cell border border-brick-edge"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold leading-tight">
                    {SERVICES[id].label}
                  </span>
                  <span className="mt-1 block text-sm text-text-dim">
                    {durationText(SERVICES[id].durationMinutes)}
                  </span>
                </span>
                <Icon
                  name="chevronRight"
                  className={`size-5 shrink-0 text-text-dim transition-[color,transform] group-hover:translate-x-0.5 ${SERVICE_STYLE[id].arrow}`}
                />
              </button>
            ))}
          </div>

          {board ? (
            <p className="mt-4 text-sm text-text-dim">
              {board.days.length === 1
                ? "Esta semana hay 1 día abierto."
                : `Esta semana hay ${board.days.length} días abiertos.`}
            </p>
          ) : null}
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
                label: SERVICES[id].shortLabel,
                hint: `${SERVICES[id].durationMinutes}′`,
                icon: SERVICE_STYLE[id].icon,
                spoken: `${SERVICES[id].label}, ${durationText(SERVICES[id].durationMinutes)}`,
              }))}
            />
          </div>

          {requestBlocks}
          <MyBookings
            bookings={myBookings}
            cancellingId={cancellingId}
            onCancel={(booking) => void cancel(booking)}
          />

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
            className={`mt-4 flex flex-col gap-4 transition-opacity ${stale ? "opacity-50" : ""}`}
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
                  durationMinutes={SERVICES[serviceId].durationMinutes}
                  myBookingId={
                    myBookings.find((booking) => booking.date === day.date)?.id ?? null
                  }
                  pendingTargetIds={pendingTargetIds}
                  onPick={(startTime) =>
                    setPicked({ date: day.date, startTime })
                  }
                  onRequest={(booking) => setRequestTarget({ date: day.date, booking })}
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
            toast(`Reservado: ${formatWeekday(picked.date)} ${formatDayNumber(picked.date)} a las ${picked.startTime}`);
            await load();
            document
              .getElementById("mi-reserva")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onSlotTaken={() => void load()}
        />
      ) : null}

      {requestTarget && serviceId ? (
        <RequestSheet
          token={token}
          date={requestTarget.date}
          booking={requestTarget.booking}
          serviceId={serviceId}
          myStartTime={
            myBookings.find((booking) => booking.date === requestTarget.date)?.startTime ?? null
          }
          onClose={() => setRequestTarget(null)}
          onExpired={() => setExpired(true)}
          onSent={async () => {
            toast(`Petición enviada a ${requestTarget.booking.clientName}`);
            setRequestTarget(null);
            await load();
          }}
        />
      ) : null}

      {dialog}
    </main>
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
    <div id="mi-reserva" className="mt-4 flex scroll-mt-32 flex-col">
      {bookings.map((booking) => (
        <Rail
          key={booking.id}
          tone="lime"
          label="Tu hora"
          className="animate-flash-lime rounded-cell"
          action={
            <Button
              variant="danger"
              size="sm"
              loading={cancellingId === booking.id}
              onClick={() => onCancel(booking)}
            >
              Liberar
            </Button>
          }
        >
          <p className="font-semibold">
            Tienes hora el {formatWeekday(booking.date)} {formatDayNumber(booking.date)} a las{" "}
            <span className="tabular-hours text-neon-lime">{booking.startTime}</span>
          </p>
          <p className="text-sm text-text-dim">
            {serviceName(booking.serviceId)}, hasta las{" "}
            <span className="tabular-hours">{booking.endTime}</span>
          </p>
        </Rail>
      ))}
    </div>
  );
}

function DayCard({
  day,
  disabled,
  hasMine,
  durationMinutes,
  myBookingId,
  pendingTargetIds,
  onPick,
  onRequest,
}: {
  day: PublicDay;
  disabled: boolean;
  hasMine: boolean;
  durationMinutes: number;
  myBookingId: string | null;
  pendingTargetIds: string[];
  onPick: (startTime: string) => void;
  onRequest: (booking: PublicBooking) => void;
}) {
  const free = day.availableStarts.length;
  const weekday = formatWeekday(day.date);
  // Siempre se ve el día entero: horas libres y quién tiene cada una.
  const slots = buildDaySlots(day.availableStarts, day.bookings);

  return (
    <section
      id={`dia-${day.date}`}
      aria-labelledby={`dia-${day.date}-t`}
      className="rounded-panel border border-brick-edge bg-brick p-4"
    >
      <div className="flex items-end gap-3">
        <span
          aria-hidden
          className="font-display text-[56px] tabular-hours text-text"
        >
          {formatDayNumber(day.date)}
        </span>
        <div className="min-w-0 flex-1 pb-1">
          <h2
            id={`dia-${day.date}-t`}
            className="font-display text-[28px] uppercase text-text"
          >
            {weekday}
            <span className="sr-only"> {formatDayNumber(day.date)}</span>
          </h2>
          <p className="text-sm text-text-dim">
            de{" "}
            <span className="tabular-hours">
              {day.windows
                .map((window) => `${window.startTime} a ${window.endTime}`)
                .join(" y de ")}
            </span>
          </p>
        </div>
      </div>

      <p className={`mt-3 text-sm ${hasMine ? "text-neon-lime" : free > 0 ? "text-neon-cyan" : "text-text-dim"}`}>
        {hasMine
          ? "Ya tienes hora este día."
          : free === 0
            ? "No queda hueco para este corte."
            : free === 1
              ? "Queda 1 hora libre."
              : `Quedan ${free} horas libres.`}
      </p>

      {slots.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2 min-[360px]:grid-cols-4">
          {slots.map((slot) => {
            if (slot.kind === "booked") {
              const { booking } = slot;
              const mine = Boolean(getCancelToken(booking.id));
              const state = mine
                ? "own"
                : requestState({
                    booking,
                    day,
                    durationMinutes,
                    myBookingId,
                    pendingTargetIds,
                  });
              const detail = `${booking.startTime}–${booking.endTime}, ${mine ? "tu reserva" : booking.clientName}, ${serviceName(booking.serviceId)}`;
              const cellClass = `flex min-h-12 min-w-0 flex-col items-center justify-center rounded-cell border bg-night px-1.5 leading-tight`;
              const label = (
                <>
                  <span className="text-[11px] tabular-hours text-text-dim">
                    {booking.startTime}
                  </span>
                  <span
                    className={`w-full truncate text-center text-xs font-semibold ${
                      mine ? "text-neon-lime" : "text-text"
                    }`}
                  >
                    {mine ? "Tú" : booking.clientName}
                  </span>
                  {state === "pending" ? (
                    <span className="text-[10px] text-neon-cyan">Pedida</span>
                  ) : null}
                </>
              );

              if (state === "ok") {
                return (
                  <button
                    key={booking.id}
                    type="button"
                    disabled={disabled}
                    aria-label={`Pedir a ${booking.clientName} su hora: ${detail}`}
                    title={`Pedir a ${booking.clientName}`}
                    onClick={() => onRequest(booking)}
                    className={`${cellClass} border-dashed border-mortar touch-manipulation transition-[border-color,transform] hover:border-neon-cyan/60 active:scale-95 disabled:opacity-50 ${focusRing}`}
                  >
                    {label}
                  </button>
                );
              }

              return (
                <div
                  key={booking.id}
                  role="img"
                  aria-label={
                    state === "no-fit"
                      ? `Cogida: ${detail}. Tu corte no cabe en esta hora.`
                      : state === "pending"
                        ? `Cogida: ${detail}. Ya se la has pedido.`
                        : `Cogida: ${detail}`
                  }
                  title={detail}
                  className={`${cellClass} ${
                    mine
                      ? "border-neon-lime/60"
                      : state === "pending"
                        ? "border-neon-cyan/40"
                        : "border-brick-edge"
                  }`}
                >
                  {label}
                </div>
              );
            }
            if (hasMine) {
              // Visible pero sin reservar: solo se puede tener una hora al día.
              return (
                <div
                  key={slot.start}
                  role="img"
                  aria-label={`Libre a las ${slot.start}. Ya tienes hora este día.`}
                  title="Libre (ya tienes hora este día)"
                  className="flex min-h-12 items-center justify-center rounded-cell border border-neon-cyan/20 text-base font-semibold text-neon-cyan/45 tabular-hours"
                >
                  {slot.start}
                </div>
              );
            }
            return (
              <button
                key={slot.start}
                type="button"
                disabled={disabled}
                aria-label={`Reservar ${weekday} a las ${slot.start}`}
                onClick={() => onPick(slot.start)}
                className={`min-h-12 rounded-cell border border-neon-cyan/50 bg-neon-cyan/[0.04] text-base font-semibold text-neon-cyan tabular-hours touch-manipulation transition-[background-color,box-shadow,transform] hover:bg-neon-cyan/10 hover:shadow-[0_0_12px_rgba(62,224,255,0.25)] active:scale-95 disabled:opacity-50 ${focusRing}`}
              >
                {slot.start}
              </button>
            );
          })}
        </div>
      ) : null}

      {day.bookings.some((booking) => booking.id !== myBookingId) ? (
        <p className="mt-3 text-sm text-text-dim">
          {hasMine
            ? "Toca el nombre de alguien para pedirle que te cambie la hora."
            : "Toca una hora libre para reservarla, o el nombre de alguien para pedirle la suya."}
        </p>
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
          <span className="animate-flash-lime flex size-20 items-center justify-center rounded-full border border-neon-lime/40 bg-night text-neon-lime">
            <Icon name="star" glow className="size-10" />
          </span>
          <p className="mt-4 text-xl font-semibold text-neon-lime">
            Reservado
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
      title="Reservar esta hora"
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
          Reservar las {picked.startTime}
        </Button>
      }
    >
      <p className="font-display text-[56px] tabular-hours text-text">
        {picked.startTime}
      </p>
      <p className="mt-1 text-text-dim first-letter:uppercase">
        {formatDay(picked.date)}, {service.label.toLowerCase()} de{" "}
        {durationText(service.durationMinutes)}
      </p>

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
