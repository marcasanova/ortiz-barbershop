import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/db/client";
import { normalizeName } from "@/domain/name";
import { getService } from "@/domain/services";
import { hashSecret } from "@/lib/crypto";
import { jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";
import { toHhMm } from "@/server/time";


export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  let body: {
    serviceId?: unknown;
    date?: unknown;
    startTime?: unknown;
    name?: unknown;
    clientKey?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_NAME", 400);
  }

  if (
    typeof body.serviceId !== "string" ||
    typeof body.date !== "string" ||
    typeof body.startTime !== "string" ||
    typeof body.name !== "string" ||
    typeof body.clientKey !== "string" ||
    body.clientKey.length < 1
  ) {
    return jsonError("INVALID_NAME", 400);
  }

  let name: string;
  try {
    name = normalizeName(body.name);
  } catch {
    return jsonError("INVALID_NAME", 400);
  }

  let service;
  try {
    service = getService(body.serviceId);
  } catch {
    return jsonError("INVALID_SERVICE", 400);
  }

  const cancelToken = randomUUID();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("book_slot", {
    p_token: token,
    p_service_id: service.id,
    p_date: body.date,
    p_start_time: body.startTime,
    p_client_name: name,
    p_client_key_hash: hashSecret(body.clientKey),
    p_cancel_token_hash: hashSecret(cancelToken),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonOk(
    {
      booking: {
        id: row.booking_id,
        serviceId: row.service_id,
        date: row.slot_date,
        startTime: toHhMm(String(row.start_time)),
        endTime: toHhMm(String(row.end_time)),
        clientName: row.client_name,
      },
      cancelToken,
    },
    201,
  );
}
