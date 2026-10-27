"use client";

import { useState } from "react";
import { SERVICES, type ServiceId } from "@/domain/services";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { api, ApiError } from "@/lib/api";
import { getClientKey, getDisplayName, saveRequestToken, setDisplayName } from "@/lib/client-identity";
import type { PublicBooking } from "@/lib/day-slots";
import { formatDay, formatDayMonth, formatWeekday } from "@/lib/format";
import type { IncomingRequest, OutgoingRequest } from "@/server/swap-requests";

export type MySwapRequests = { incoming: IncomingRequest[]; outgoing: OutgoingRequest[] };

export const REQUEST_ERROR_COPY: Record<string, string> = {
  CANNOT_REQUEST_OWN: "Esa hora ya es tuya.",
  REQUEST_ALREADY_PENDING: "Ya le has pedido esta hora. Espera a que responda.",
  REQUEST_DOES_NOT_FIT: "Tu corte no cabe en esa hora.",
  REQUEST_NOT_PENDING: "Esa petición ya no está pendiente.",
  NAME_TAKEN_THAT_DAY: "Este nombre ya está apuntado este día. Cambia el nombre.",
  ALREADY_BOOKED_THAT_DAY: "Ya estás apuntado este día.",
  INVALID_NAME: "Pon un nombre de 1 a 40 letras.",
  NOT_FOUND: "Esa reserva ya no existe.",
  LINK_EXPIRED: "Este enlace ya no está activo.",
};

function dayLabel(date: string) {
  return `${formatWeekday(date)} ${formatDayMonth(date)}`;
}

/** Peticiones que te hacen: el bloque más visible del tablero. */
export function IncomingRequests({
  requests,
  busyId,
  onAnswer,
}: {
  requests: IncomingRequest[];
  busyId: string | null;
  onAnswer: (request: IncomingRequest, accept: boolean) => void;
}) {
  if (requests.length === 0) {
    return null;
  }
  return (
    <section aria-label="Te piden tu hora" className="mt-5 flex flex-col gap-2">
      {requests.map((request) => (
        <div
          key={request.id}
          className="rounded-2xl border border-neon-cyan/60 bg-brick p-4 shadow-[0_0_22px_rgba(62,224,255,0.15)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-neon-cyan">
            Te piden tu hora
          </p>
          <p className="mt-1 font-semibold">
            {request.requesterName} te pide tus{" "}
            <span className="tabular-hours">{request.startTime}</span>
          </p>
          <p className="text-sm text-text-dim first-letter:uppercase">
            {dayLabel(request.date)}
            {request.swapStartTime ? (
              <>
                {" "}· te ofrece sus{" "}
                <span className="tabular-hours text-text">{request.swapStartTime}</span> a cambio
              </>
            ) : (
              " · no tiene hora ese día"
            )}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === request.id}
              onClick={() => onAnswer(request, false)}
            >
              No, gracias
            </Button>
            <Button
              variant="cyan"
              size="sm"
              loading={busyId === request.id}
              onClick={() => onAnswer(request, true)}
            >
              {request.swapStartTime ? `Cambiar por sus ${request.swapStartTime}` : "Dársela"}
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Tus peticiones pendientes, con la opción de retirarlas. */
export function OutgoingRequests({
  requests,
  busyId,
  onWithdraw,
}: {
  requests: OutgoingRequest[];
  busyId: string | null;
  onWithdraw: (request: OutgoingRequest) => void;
}) {
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return null;
  }
  return (
    <section aria-label="Tus peticiones" className="mt-3 flex flex-col gap-2">
      {pending.map((request) => (
        <div
          key={request.id}
          className="flex items-center gap-3 rounded-2xl border border-brick-edge bg-brick p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-brick-edge bg-night text-text-dim">
            <Icon name="clock" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">
              Esperando respuesta
            </p>
            <p className="mt-0.5 truncate font-semibold">
              {request.ownerName} ·{" "}
              <span className="tabular-hours">{request.startTime}</span>
            </p>
            <p className="truncate text-sm text-text-dim first-letter:uppercase">
              {dayLabel(request.date)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            loading={busyId === request.id}
            onClick={() => onWithdraw(request)}
          >
            Retirar
          </Button>
        </div>
      ))}
    </section>
  );
}

/** Pedirle a alguien su hora. */
export function RequestSheet({
  token,
  date,
  booking,
  serviceId,
  myStartTime,
  onClose,
  onSent,
  onExpired,
}: {
  token: string;
  date: string;
  booking: PublicBooking;
  serviceId: ServiceId;
  // Tu hora ese día, si tienes: entonces la petición es un intercambio.
  myStartTime: string | null;
  onClose: () => void;
  onSent: () => Promise<void>;
  onExpired: () => void;
}) {
  const [name, setName] = useState(() => getDisplayName());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const swap = myStartTime !== null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!swap && !name.trim()) {
      setError(REQUEST_ERROR_COPY.INVALID_NAME);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = await api<{ request: { id: string }; cancelToken: string }>(
        `/api/s/${token}/requests`,
        {
          method: "POST",
          body: JSON.stringify({
            targetBookingId: booking.id,
            serviceId,
            name: swap ? null : name.trim(),
            clientKey: getClientKey(),
          }),
        },
      );
      saveRequestToken(data.request.id, data.cancelToken);
      if (!swap) {
        setDisplayName(name.trim());
      }
      await onSent();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "INTERNAL_ERROR";
      if (code === "LINK_EXPIRED") {
        onExpired();
        return;
      }
      setError(REQUEST_ERROR_COPY[code] ?? "No se ha podido enviar la petición.");
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Pedir esta hora"
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      footer={
        <Button type="submit" form="request-form" variant="cyan" className="w-full" loading={busy}>
          Enviar petición a {booking.clientName}
        </Button>
      }
    >
      <div className="flex items-center gap-4 rounded-2xl bg-night p-4">
        <div className="text-center">
          <p className="font-display text-4xl leading-none tabular-hours text-text">
            {booking.startTime}
          </p>
          <p className="mt-1 text-xs text-text-dim">{SERVICES[serviceId].durationMinutes} min</p>
        </div>
        <div className="min-w-0 border-l border-brick-edge pl-4">
          <p className="font-semibold first-letter:uppercase">{formatDay(date)}</p>
          <p className="text-sm text-text-dim">Ahora es de {booking.clientName}</p>
        </div>
      </div>

      <form id="request-form" className="mt-5" onSubmit={submit} noValidate>
        {swap ? (
          <p className="rounded-xl border border-brick-edge px-3 py-3 text-sm text-text-dim">
            Le ofreces tus <span className="tabular-hours font-semibold text-text">{myStartTime}</span>{" "}
            a cambio. Si acepta, os cambiáis la hora.
          </p>
        ) : (
          <>
            <label className="block text-sm text-text-dim" htmlFor="request-name">
              Tu nombre
            </label>
            <Input
              id="request-name"
              className="mt-1.5"
              value={name}
              maxLength={40}
              autoFocus
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="send"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "request-error" : "request-help"}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="Cómo te conocemos"
            />
          </>
        )}
        {error ? (
          <p id="request-error" role="alert" className="mt-2 text-sm text-neon-orange">
            {error}
          </p>
        ) : (
          <p id="request-help" className="mt-2 text-xs text-text-dim">
            {booking.clientName} lo verá al abrir el enlace y podrá aceptar o decir que no.
          </p>
        )}
      </form>
    </Sheet>
  );
}
