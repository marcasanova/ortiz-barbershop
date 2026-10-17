"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { TimePicker } from "@/components/ui/TimePicker";
import { api, ApiError } from "@/lib/api";
import { formatDay, serviceLabel } from "@/lib/format";
import { useBoardRealtime } from "@/lib/use-board-realtime";

type WindowRow = { startTime: string; endTime: string };

type AdminDay = {
  date: string;
  windows: { id: string; startTime: string; endTime: string }[];
  bookings: {
    id: string;
    clientName: string;
    serviceId: string;
    startTime: string;
    endTime: string;
  }[];
};

type AdminWeek = {
  id: string;
  isActive: boolean;
  hasPublicToken: boolean;
  days: AdminDay[];
};

export function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [week, setWeek] = useState<AdminWeek | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("16:00");
  const [newEnd, setNewEnd] = useState("20:00");
  const [busy, setBusy] = useState(false);

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

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setPinError("");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      setAuthed(true);
      setPin("");
      await load();
    } catch {
      setPinError("PIN incorrecto");
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setWeek(null);
  }

  async function createWeek() {
    setBusy(true);
    try {
      await api("/api/admin/week", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveDay(date: string, windows: WindowRow[]) {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin/week/days", {
        method: "PUT",
        body: JSON.stringify({ date, windows }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeDay(date: string) {
    if (
      !confirm(
        "Si quitas el día, se cancelan las reservas de esa franja. ¿Seguimos?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api(`/api/admin/week/days?date=${date}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addDay(event: React.FormEvent) {
    event.preventDefault();
    if (!newDate) {
      return;
    }
    await saveDay(newDate, [{ startTime: newStart, endTime: newEnd }]);
    setNewDate("");
  }

  async function generateLink() {
    if (
      !confirm(
        "Esto crea un enlace nuevo y el WhatsApp anterior deja de valer.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ url: string }>("/api/admin/link", {
        method: "POST",
      });
      setLink(data.url);
      setMessage("Enlace listo para copiar");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) {
      return;
    }
    await navigator.clipboard.writeText(link);
    setMessage("Copiado");
  }

  async function cancelBooking(id: string) {
    setBusy(true);
    try {
      await api(`/api/admin/bookings/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-text-dim">
        Cargando…
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Header compact />
        <Card className="mx-4 mb-10">
          <h1 className="font-display text-2xl uppercase">Entrar</h1>
          <p className="mt-1 text-sm text-text-dim">Solo Raúl. Escribe el PIN.</p>
          <form className="mt-4 flex flex-col gap-3" onSubmit={login}>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="PIN"
            />
            {pinError ? (
              <p className="text-sm text-neon-orange">{pinError}</p>
            ) : null}
            <Button className="w-full" type="submit">
              Entrar
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-3 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-4">
      <Header compact />
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase">Agenda</h1>
        <Button variant="ghost" className="shrink-0 px-4" onClick={() => void logout()}>
          Salir
        </Button>
      </div>

      <Card>
        <p className="text-sm text-text-dim">
          Generar enlace invalida el WhatsApp anterior. Editar franjas no lo
          cambia.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            disabled={busy || !week}
            onClick={() => void generateLink()}
          >
            Generar enlace
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            disabled={!link}
            onClick={() => void copyLink()}
          >
            Copiar
          </Button>
        </div>
        {link ? (
          <p className="mt-3 break-all text-sm text-neon-cyan">{link}</p>
        ) : (
          <p className="mt-3 text-sm text-mortar">Aún no hay enlace.</p>
        )}
        {message ? (
          <p className="mt-2 text-sm text-neon-lime">{message}</p>
        ) : null}
      </Card>

      {!week ? (
        <Card>
          <p className="text-text-dim">No hay semana. Créala y pon los días.</p>
          <Button
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => void createWeek()}
          >
            Crear semana
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="font-display uppercase">Añadir día</h2>
            <form className="mt-3 flex flex-col gap-3" onSubmit={addDay}>
              <DatePicker
                value={newDate}
                onChange={setNewDate}
                disabledDates={week.days.map((day) => day.date)}
              />
              <div className="grid grid-cols-2 gap-2">
                <TimePicker
                  label="Desde"
                  value={newStart}
                  onChange={setNewStart}
                />
                <TimePicker
                  label="Hasta"
                  value={newEnd}
                  onChange={setNewEnd}
                />
              </div>
              <Button className="w-full" disabled={busy || !newDate} type="submit">
                Guardar día
              </Button>
            </form>
          </Card>

          {week.days.map((day) => (
            <DayEditor
              key={day.date}
              day={day}
              busy={busy}
              onSave={saveDay}
              onRemove={removeDay}
              onCancelBooking={cancelBooking}
            />
          ))}
        </>
      )}
    </main>
  );
}

function DayEditor({
  day,
  busy,
  onSave,
  onRemove,
  onCancelBooking,
}: {
  day: AdminDay;
  busy: boolean;
  onSave: (date: string, windows: WindowRow[]) => Promise<void>;
  onRemove: (date: string) => Promise<void>;
  onCancelBooking: (id: string) => Promise<void>;
}) {
  const [windows, setWindows] = useState<WindowRow[]>(
    day.windows.map((window) => ({
      startTime: window.startTime,
      endTime: window.endTime,
    })),
  );

  useEffect(() => {
    setWindows(
      day.windows.map((window) => ({
        startTime: window.startTime,
        endTime: window.endTime,
      })),
    );
  }, [day]);

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg uppercase leading-tight">
          {formatDay(day.date)}
        </h2>
        <Button
          variant="danger"
          className="w-full"
          disabled={busy}
          onClick={() => void onRemove(day.date)}
        >
          Quitar día
        </Button>
      </div>
      <p className="mt-2 text-xs text-neon-orange">
        Si acortas o quitas la franja, se cancelan las reservas de ese tramo.
      </p>

      <div className="mt-3 space-y-3">
        {windows.map((window, index) => (
          <div key={index} className="grid grid-cols-2 gap-2">
            <TimePicker
              label="Desde"
              value={window.startTime}
              onChange={(startTime) => {
                const next = [...windows];
                next[index] = { ...window, startTime };
                setWindows(next);
              }}
            />
            <TimePicker
              label="Hasta"
              value={window.endTime}
              onChange={(endTime) => {
                const next = [...windows];
                next[index] = { ...window, endTime };
                setWindows(next);
              }}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          className="w-full"
          type="button"
          onClick={() =>
            setWindows([...windows, { startTime: "16:00", endTime: "20:00" }])
          }
        >
          Añadir descanso / otra franja
        </Button>
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void onSave(day.date, windows)}
        >
          Guardar franjas
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {day.bookings.length === 0 ? (
          <li className="text-sm text-mortar">Nadie apuntado.</li>
        ) : (
          day.bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-col gap-2 rounded-xl border border-brick-edge p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm">
                <span className="tabular-hours">
                  {booking.startTime}–{booking.endTime}
                </span>{" "}
                {booking.clientName} · {serviceLabel(booking.serviceId)}
              </span>
              <Button
                variant="danger"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => void onCancelBooking(booking.id)}
              >
                Cancelar
              </Button>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
