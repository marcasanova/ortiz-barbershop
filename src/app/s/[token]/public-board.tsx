"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICES, type ServiceId } from "@/domain/services";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import {
  getCancelToken,
  getClientKey,
  getDisplayName,
  removeCancelToken,
  saveCancelToken,
  setDisplayName,
} from "@/lib/client-identity";
import { formatDay, serviceLabel } from "@/lib/format";
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

const ERROR_COPY: Record<string, string> = {
  NAME_TAKEN_THAT_DAY:
    "Este nombre ya está apuntado este día. Cambia el nombre.",
  ALREADY_BOOKED_THAT_DAY: "Ya estás apuntado este día. Cancela el tuyo antes.",
  SLOT_TAKEN: "Esa hora ya no está libre. Elige otra.",
  LINK_EXPIRED: "Este enlace ya no está activo.",
  INVALID_NAME: "Pon un nombre de 1 a 40 letras.",
};

export function PublicBoard({ token }: { token: string }) {
  const [serviceId, setServiceId] = useState<ServiceId>("corte");
  const [board, setBoard] = useState<PublicBoardData | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [picked, setPicked] = useState<{ date: string; startTime: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<PublicBoardData>(
        `/api/s/${token}?service=${serviceId}`,
      );
      setBoard(data);
      setExpired(false);
      setLoadError("");
      setTick((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LINK_EXPIRED") {
        setExpired(true);
        setBoard(null);
        return;
      }
      setLoadError("No se ha podido cargar la agenda.");
    }
  }, [token, serviceId]);

  useEffect(() => {
    setName(getDisplayName());
    void load();
  }, [load]);

  useBoardRealtime(load);

  async function book() {
    if (!picked) {
      return;
    }
    setFormError("");
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
          name,
          clientKey: getClientKey(),
        }),
      });
      saveCancelToken(data.booking.id, data.cancelToken);
      setDisplayName(name);
      setSuccess("Estás apuntado");
      setPicked(null);
      await load();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      setFormError(ERROR_COPY[code] ?? "No se ha podido apuntar.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bookingId: string) {
    const cancelToken = getCancelToken(bookingId);
    if (!cancelToken) {
      return;
    }
    setBusy(true);
    try {
      await api(`/api/s/${token}/bookings/${bookingId}`, {
        method: "DELETE",
        body: JSON.stringify({ cancelToken }),
      });
      removeCancelToken(bookingId);
      setSuccess("Hueco liberado");
      await load();
    } catch {
      setLoadError("No se ha podido cancelar.");
    } finally {
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-lg flex-col">
        <Header />
        <p className="px-6 pb-10 text-center text-text-dim">
          Este enlace ya no está activo. Pide a Raúl el nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <Header compact />
      <h1 className="font-display text-center text-2xl uppercase text-text">
        Elige corte
      </h1>
      <div className="mt-4 flex flex-col gap-2 sm:grid sm:grid-cols-2">
        {(Object.keys(SERVICES) as ServiceId[]).map((id) => (
          <Button
            key={id}
            type="button"
            className="w-full"
            variant={serviceId === id ? "primary" : "ghost"}
            onClick={() => setServiceId(id)}
          >
            {SERVICES[id].label}
            <span className="ml-1 font-normal opacity-80">
              {SERVICES[id].durationMinutes} min
            </span>
          </Button>
        ))}
      </div>

      {success ? (
        <p className="mt-4 text-center text-neon-lime">{success}</p>
      ) : null}
      {loadError ? (
        <p className="mt-4 text-center text-neon-orange">{loadError}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        {board?.days.map((day) => (
          <Card key={day.date}>
            <h2 className="font-display text-lg uppercase">
              {formatDay(day.date)}
            </h2>
            <p className="text-xs text-mortar">
              {day.windows
                .map((window) => `${window.startTime}–${window.endTime}`)
                .join(" · ")}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {day.availableStarts.length === 0 ? (
                <p className="text-sm text-text-dim">No queda hueco para este corte.</p>
              ) : (
                day.availableStarts.map((start) => (
                  <Button
                    key={start}
                    type="button"
                    variant="cyan"
                    className="tabular-hours px-3 py-2"
                    disabled={busy}
                    onClick={() => {
                      setFormError("");
                      setPicked({ date: day.date, startTime: start });
                    }}
                  >
                    {start}
                  </Button>
                ))
              )}
            </div>

            <ul className="mt-4 space-y-1 text-sm text-text-dim">
              {day.bookings.map((booking) => {
                const canCancel = Boolean(getCancelToken(booking.id));
                return (
                  <li
                    key={booking.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      <span className="tabular-hours">
                        {booking.startTime}–{booking.endTime}
                      </span>{" "}
                      {booking.clientName} · {serviceLabel(booking.serviceId)}
                    </span>
                    {canCancel ? (
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => void cancel(booking.id)}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {picked ? (
        <Modal
          title="Apúntate"
          onClose={() => {
            if (!busy) {
              setPicked(null);
            }
          }}
        >
          <p className="text-sm text-text-dim">
            {formatDay(picked.date)} ·{" "}
            <span className="tabular-hours">{picked.startTime}</span> ·{" "}
            {SERVICES[serviceId].label}
          </p>
          <label className="mt-4 block text-sm" htmlFor="name">
            Tu nombre
          </label>
          <Input
            id="name"
            className="mt-1"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            placeholder="Cómo te conocemos"
          />
          {formError ? (
            <p className="mt-2 text-sm text-neon-orange">{formError}</p>
          ) : null}
          <Button
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => void book()}
          >
            Apúntate
          </Button>
        </Modal>
      ) : null}
    </main>
  );
}
