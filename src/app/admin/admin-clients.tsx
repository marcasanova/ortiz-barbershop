"use client";

import { useState } from "react";
import { Button, focusRing, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { TimePicker } from "@/components/ui/TimePicker";
import { SERVICES, type ServiceId } from "@/domain/services";
import { ApiError } from "@/lib/api";
import { durationText, formatDay, formatDayShort, serviceName } from "@/lib/format";

export type AdminBooking = {
  id: string;
  clientName: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  paid: boolean;
  createdByAdmin: boolean;
};

export type ClientFields = {
  name: string;
  serviceId: ServiceId;
  date: string;
  startTime: string;
};

export type SwapCandidate = AdminBooking & { date: string };

const ERROR_COPY: Record<string, string> = {
  SLOT_TAKEN: "Esa hora pisa a otro cliente.",
  DAY_NOT_OPEN: "Ese día no está abierto. Añádelo primero.",
  DAY_TAKEN: "Ese día ya tiene horario.",
  NAME_TAKEN_THAT_DAY: "Ese nombre ya está apuntado ese día.",
  ALREADY_BOOKED_THAT_DAY: "Esa persona ya tiene hora ese día.",
  INVALID_NAME: "Pon un nombre de 1 a 40 letras.",
  NOT_FOUND: "Ese cliente ya no existe.",
};

export function adminErrorCopy(error: unknown, fallback: string) {
  return (error instanceof ApiError && ERROR_COPY[error.code]) || fallback;
}

const SERVICE_IDS = Object.keys(SERVICES) as ServiceId[];

/** Fila de cliente: casilla de pagado, su ficha y el botón de moverlo. */
export function ClientRow({
  booking,
  readOnly,
  onTogglePaid,
  onOpen,
  onMove,
}: {
  booking: AdminBooking;
  readOnly: boolean;
  onTogglePaid: (paid: boolean) => void;
  onOpen: () => void;
  onMove: () => void;
}) {
  const details = (
    <>
      <span className="w-[5.5rem] shrink-0 text-sm tabular-hours text-text-dim">
        {booking.startTime}–{booking.endTime}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{booking.clientName}</span>
        <span className="block truncate text-xs text-text-dim">
          {serviceName(booking.serviceId)}
        </span>
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-2">
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={booking.paid}
          onChange={(event) => onTogglePaid(event.target.checked)}
          aria-label={`${booking.clientName} ha pagado`}
          className={`size-6 cursor-pointer accent-neon-lime ${focusRing}`}
        />
      </label>
      {readOnly ? (
        <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3">{details}</div>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Editar a ${booking.clientName}`}
            className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-cell text-left touch-manipulation hover:bg-brick-edge/30 ${focusRing}`}
          >
            {details}
          </button>
          <IconButton
            label={`Mover o intercambiar a ${booking.clientName}`}
            onClick={onMove}
          >
            <Icon name="swap" className="size-5 text-neon-cyan" />
          </IconButton>
        </>
      )}
    </li>
  );
}

/** Ficha de un cliente: añadirlo, editarlo o eliminarlo. */
export function ClientSheet({
  booking,
  date,
  openDates,
  onClose,
  onSave,
  onDelete,
}: {
  // null = cliente nuevo.
  booking: AdminBooking | null;
  date: string;
  openDates: string[];
  onClose: () => void;
  onSave: (fields: ClientFields) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(booking?.clientName ?? "");
  const [serviceId, setServiceId] = useState<ServiceId>(
    booking?.serviceId === "corte_barba" ? "corte_barba" : "corte",
  );
  const [selectedDate, setSelectedDate] = useState(date);
  const [startTime, setStartTime] = useState(booking?.startTime ?? "16:00");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(ERROR_COPY.INVALID_NAME);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), serviceId, date: selectedDate, startTime });
    } catch (caught) {
      setError(adminErrorCopy(caught, "No se ha podido guardar."));
      setSaving(false);
    }
  }

  return (
    <Sheet
      title={booking ? `Editar a ${booking.clientName}` : "Añadir cliente"}
      onClose={() => {
        if (!saving) {
          onClose();
        }
      }}
      footer={
        <div className="flex flex-col gap-2">
          <Button type="submit" form="client-form" className="w-full" loading={saving}>
            {booking ? "Guardar cambios" : "Añadir cliente"}
          </Button>
          {booking ? (
            <Button variant="danger" size="sm" className="w-full" onClick={onDelete}>
              Eliminar
            </Button>
          ) : null}
        </div>
      }
    >
      <form id="client-form" className="flex flex-col gap-4 pt-1" onSubmit={submit} noValidate>
        <div>
          <label className="block text-sm text-text-dim" htmlFor="client-name">
            Nombre
          </label>
          <Input
            id="client-name"
            className="mt-1.5"
            value={name}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="words"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm text-text-dim">Corte</p>
          <Segmented
            label="Corte"
            value={serviceId}
            onChange={setServiceId}
            options={SERVICE_IDS.map((id) => ({
              value: id,
              label: SERVICES[id].shortLabel,
              hint: `${SERVICES[id].durationMinutes}′`,
              spoken: `${SERVICES[id].label}, ${durationText(SERVICES[id].durationMinutes)}`,
            }))}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm text-text-dim">Día</p>
          <div className="flex flex-wrap gap-2">
            {openDates.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === selectedDate}
                onClick={() => setSelectedDate(option)}
                className={`min-h-11 rounded-full border px-3.5 text-sm capitalize touch-manipulation ${focusRing} ${
                  option === selectedDate
                    ? "border-neon-cyan text-neon-cyan"
                    : "border-brick-edge text-text-dim"
                }`}
              >
                {formatDayShort(option)}
              </button>
            ))}
          </div>
        </div>

        <TimePicker label="Hora" value={startTime} onChange={setStartTime} />
        <p className="-mt-2 text-xs text-text-dim">
          Puede ser fuera del horario, pero sin pisar a nadie.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-neon-orange">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/** Mover a un cliente a una hora libre o cambiarle la hora con otro. */
export function MoveClientSheet({
  booking,
  freeDays,
  swapCandidates,
  onClose,
  onMoveTo,
  onSwap,
}: {
  booking: AdminBooking;
  freeDays: { date: string; starts: string[] }[];
  swapCandidates: SwapCandidate[];
  onClose: () => void;
  onMoveTo: (date: string, startTime: string) => void;
  onSwap: (other: SwapCandidate) => void;
}) {
  return (
    <Sheet title={`Mover a ${booking.clientName}`} onClose={onClose}>
      <p className="text-sm text-text-dim">
        Ahora va a las <span className="tabular-hours text-text">{booking.startTime}</span>. Cada
        uno mantiene su corte.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Horas libres</h3>
      {freeDays.length === 0 ? (
        <p className="mt-1 text-sm text-text-dim">No hay horas libres donde quepa su corte.</p>
      ) : (
        freeDays.map((day) => (
          <div key={day.date} className="mt-2">
            <p className="text-sm capitalize text-text-dim">{formatDayShort(day.date)}</p>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {day.starts.map((start) => (
                <button
                  key={start}
                  type="button"
                  onClick={() => onMoveTo(day.date, start)}
                  className={`min-h-11 rounded-cell border border-neon-cyan/40 text-sm font-semibold tabular-hours text-neon-cyan touch-manipulation hover:border-neon-cyan active:scale-95 ${focusRing}`}
                >
                  {start}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <h3 className="mt-5 text-sm font-semibold">Cambiar con otro cliente</h3>
      {swapCandidates.length === 0 ? (
        <p className="mt-1 text-sm text-text-dim">No hay más clientes esta semana.</p>
      ) : (
        <ul className="mt-1 divide-y divide-brick-edge/60">
          {swapCandidates.map((other) => (
            <li key={other.id}>
              <button
                type="button"
                onClick={() => onSwap(other)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-cell text-left touch-manipulation hover:bg-brick-edge/30 ${focusRing}`}
              >
                <span className="w-[5.5rem] shrink-0 text-sm capitalize text-text-dim">
                  {formatDayShort(other.date)}
                </span>
                <span className="w-12 shrink-0 text-sm tabular-hours text-text-dim">
                  {other.startTime}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {other.clientName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** Mover un día entero, con su horario y sus clientes. */
export function MoveDaySheet({
  date,
  picker,
  target,
  onClose,
  onMove,
}: {
  date: string;
  picker: React.ReactNode;
  target: string;
  onClose: () => void;
  onMove: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      await onMove();
    } catch (caught) {
      setError(adminErrorCopy(caught, "No se ha podido mover el día."));
      setSaving(false);
    }
  }

  return (
    <Sheet
      title={`Mover el ${formatDay(date)}`}
      onClose={() => {
        if (!saving) {
          onClose();
        }
      }}
      footer={
        <Button className="w-full" loading={saving} disabled={!target} onClick={() => void submit()}>
          Mover día
        </Button>
      }
    >
      {picker}
      <p className="mt-2 text-xs text-text-dim">
        El horario y los clientes pasan a la nueva fecha.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-neon-orange">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
