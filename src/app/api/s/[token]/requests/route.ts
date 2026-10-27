import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/db/client";
import { hashSecret } from "@/lib/crypto";
import { jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";
import { parseCreateRequestBody } from "@/server/swap-requests";

// Pedirle a otro amigo su hora.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const parsed = parseCreateRequestBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  // Token de la reserva que nacerá si el dueño cede su hora.
  const cancelToken = randomUUID();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("request_swap", {
    p_token: token,
    p_target_booking_id: parsed.value.targetBookingId,
    p_service_id: parsed.value.serviceId,
    p_name: parsed.value.name,
    p_key_hash: hashSecret(parsed.value.clientKey),
    p_cancel_token_hash: hashSecret(cancelToken),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonOk({ request: { id: row.request_id, status: row.status }, cancelToken }, 201);
}
