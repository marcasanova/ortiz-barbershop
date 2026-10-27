import { normalizeName } from "@/domain/name";
import { getService, type ServiceId } from "@/domain/services";
import { toHhMm } from "./time";

// Validación de cuerpos y forma de las respuestas de las peticiones de hora.
// Las reglas de negocio (quién puede pedir, si cabe, intercambio o ceder)
// viven en Postgres: aquí solo se filtra lo que llega mal formado.

type Parsed<T> = { ok: true; value: T } | { ok: false; code: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}

export function parseCreateRequestBody(body: unknown): Parsed<{
  targetBookingId: string;
  serviceId: ServiceId;
  name: string | null;
  clientKey: string;
}> {
  const record = asRecord(body);
  if (
    !record ||
    !isNonEmptyString(record.targetBookingId) ||
    !isNonEmptyString(record.clientKey) ||
    typeof record.serviceId !== "string"
  ) {
    return { ok: false, code: "INVALID_REQUEST" };
  }

  let serviceId: ServiceId;
  try {
    serviceId = getService(record.serviceId).id;
  } catch {
    return { ok: false, code: "INVALID_SERVICE" };
  }

  let name: string | null = null;
  if (record.name !== undefined && record.name !== null) {
    if (typeof record.name !== "string") {
      return { ok: false, code: "INVALID_NAME" };
    }
    try {
      name = normalizeName(record.name);
    } catch {
      return { ok: false, code: "INVALID_NAME" };
    }
  }

  return {
    ok: true,
    value: {
      targetBookingId: record.targetBookingId,
      serviceId,
      name,
      clientKey: record.clientKey,
    },
  };
}

export function parseRespondBody(
  body: unknown,
): Parsed<{ cancelToken: string; accept: boolean }> {
  const record = asRecord(body);
  if (!record || !isNonEmptyString(record.cancelToken)) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (typeof record.accept !== "boolean") {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  return { ok: true, value: { cancelToken: record.cancelToken, accept: record.accept } };
}

export function parseClientKeyBody(body: unknown): Parsed<{ clientKey: string }> {
  const record = asRecord(body);
  if (!record || !isNonEmptyString(record.clientKey)) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  return { ok: true, value: { clientKey: record.clientKey } };
}

/** Fila de `my_swap_requests` (Postgres). */
export type SwapRequestRow = {
  request_id: string;
  role: "incoming" | "outgoing";
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  resolution: "swap" | "cede" | null;
  requester_name: string;
  owner_name: string;
  slot_date: string;
  start_time: string;
  swap_start_time: string | null;
  service_id: string;
  result_booking_id: string | null;
  target_booking_id: string | null;
};

export type IncomingRequest = {
  role: "incoming";
  id: string;
  requesterName: string;
  date: string;
  startTime: string;
  swapStartTime: string | null;
  serviceId: string;
  targetBookingId: string | null;
};

export type OutgoingRequest = {
  role: "outgoing";
  id: string;
  ownerName: string;
  date: string;
  startTime: string;
  swapStartTime: string | null;
  serviceId: string;
  status: SwapRequestRow["status"];
  resolution: SwapRequestRow["resolution"];
  resultBookingId: string | null;
};

export function toSwapRequestDto(row: SwapRequestRow): IncomingRequest | OutgoingRequest {
  const shared = {
    id: row.request_id,
    date: row.slot_date,
    startTime: toHhMm(row.start_time),
    swapStartTime: row.swap_start_time ? toHhMm(row.swap_start_time) : null,
    serviceId: row.service_id,
  };

  if (row.role === "incoming") {
    return {
      role: "incoming",
      ...shared,
      requesterName: row.requester_name,
      targetBookingId: row.target_booking_id,
    };
  }

  return {
    role: "outgoing",
    ...shared,
    ownerName: row.owner_name,
    status: row.status,
    resolution: row.resolution,
    resultBookingId: row.result_booking_id,
  };
}
