import { normalizeName } from "@/domain/name";
import { getService, type ServiceId } from "@/domain/services";

// Validación de cuerpos de las acciones de Raúl sobre reservas. Las reglas de
// negocio (solapes, día abierto, nombres únicos) viven en Postgres.

type Parsed<T> = { ok: true; value: T } | { ok: false; code: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function asRecord(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && DATE.test(value);
}

export function parseBookingBody(body: unknown): Parsed<{
  name: string;
  serviceId: ServiceId;
  date: string;
  startTime: string;
}> {
  const record = asRecord(body);
  if (
    !record ||
    !isDate(record.date) ||
    typeof record.startTime !== "string" ||
    !TIME.test(record.startTime)
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  if (typeof record.name !== "string") {
    return { ok: false, code: "INVALID_NAME" };
  }

  let name: string;
  try {
    name = normalizeName(record.name);
  } catch {
    return { ok: false, code: "INVALID_NAME" };
  }

  if (typeof record.serviceId !== "string") {
    return { ok: false, code: "INVALID_SERVICE" };
  }

  try {
    return {
      ok: true,
      value: {
        name,
        serviceId: getService(record.serviceId).id,
        date: record.date,
        startTime: record.startTime,
      },
    };
  } catch {
    return { ok: false, code: "INVALID_SERVICE" };
  }
}

export function parsePaidBody(body: unknown): Parsed<{ paid: boolean }> {
  const record = asRecord(body);
  if (!record || typeof record.paid !== "boolean") {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  return { ok: true, value: { paid: record.paid } };
}

export function parseSwapBody(
  body: unknown,
): Parsed<{ bookingA: string; bookingB: string }> {
  const record = asRecord(body);
  if (
    !record ||
    typeof record.bookingA !== "string" ||
    typeof record.bookingB !== "string" ||
    !record.bookingA ||
    !record.bookingB ||
    record.bookingA === record.bookingB
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  return { ok: true, value: { bookingA: record.bookingA, bookingB: record.bookingB } };
}

export function parseMoveDayBody(body: unknown): Parsed<{ from: string; to: string }> {
  const record = asRecord(body);
  if (!record || !isDate(record.from) || !isDate(record.to) || record.from === record.to) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  return { ok: true, value: { from: record.from, to: record.to } };
}
