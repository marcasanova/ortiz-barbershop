"use client";

import { useState } from "react";
import { SERVICES, type ServiceId } from "@/domain/services";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Rail } from "@/components/ui/Rail";
import { Sheet } from "@/components/ui/Sheet";
import { api, ApiError } from "@/lib/api";
import { getClientKey, getDisplayName, saveRequestToken, setDisplayName } from "@/lib/client-identity";
import type { PublicBooking } from "@/lib/day-slots";
import { capitalize, durationText, formatDay, formatDayNumber, formatWeekday } from "@/lib/format";
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
  return `el ${formatWeekday(date)} ${formatDayNumber(date)}`;
}

/** Peticiones que te hacen: franja cian, lo primero del tablero. */
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
    <div className="mt-4 flex flex-col gap-1">
      {requests.map((request) => (
        <Rail key={request.id} tone="cyan" label={`${request.requesterName} te pide tu hora`}>
          <p className="font-semibold">
            {request.requesterName} te pide tus{" "}
            <span className="tabular-hours text-neon-cyan">{request.startTime}</span>{" "}
            {dayLabel(request.date)}
          </p>
          <p className="text-sm text-text-dim">
            {request.swapStartTime ? (
              <>
                Te ofrece sus{" "}
                <span className="tabular-hours text-text">{request.swapStartTime}</span> a cambio.
              </>
            ) : (
              "No tiene hora ese día: si se la das, te quedas sin la tuya."
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="cyan"
              size="sm"
              loading={busyId === request.id}
              onClick={() => onAnswer(request, true)}
            >
              {request.swapStartTime ? `Cambiar por sus ${request.swapStartTime}` : "Dársela"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === request.id}
              onClick={() => onAnswer(request, false)}
            >
              No, gracias
            </Button>
          </div>
        </Rail>
      ))}
    </div>
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
    <div className="mt-2 flex flex-col">
      {pending.map((request) => (
        <Rail
          key={request.id}
          tone="muted"
          label={`Petición a ${request.ownerName}`}
          action={
            <Button
              variant="ghost"
              size="sm"
              loading={busyId === request.id}
              onClick={() => onWithdraw(request)}
            >
              Retirar
            </Button>
          }
        >
          <p className="font-semibold">
            Has pedido a {request.ownerName} sus{" "}
            <span className="tabular-hours">{request.startTime}</span>
          </p>
          <p className="text-sm text-text-dim">
            {capitalize(dayLabel(request.date).replace(/^el /, ""))}. Esperando su respuesta.
          </p>
        </Rail>
      ))}
    </div>
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
      title={`Pedir la hora a ${booking.clientName}`}
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
      <p className="font-display text-[56px] tabular-hours text-text">
        {booking.startTime}
      </p>
      <p className="mt-1 text-text-dim first-letter:uppercase">
        {formatDay(date)}. Ahora es de {booking.clientName}; tú quieres{" "}
        {SERVICES[serviceId].label.toLowerCase()} de{" "}
        {durationText(SERVICES[serviceId].durationMinutes)}.
      </p>

      <form id="request-form" className="mt-5" onSubmit={submit} noValidate>
        {swap ? (
          <p className="rounded-cell border border-brick-edge px-3 py-3 text-sm text-text-dim">
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
