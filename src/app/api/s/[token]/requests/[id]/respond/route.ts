import { createServiceClient } from "@/db/client";
import { hashSecret } from "@/lib/crypto";
import { jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";
import { parseRespondBody } from "@/server/swap-requests";

// El dueño de la hora dice sí (intercambio o ceder, lo decide el servidor) o no.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;
  const parsed = parseRespondBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, parsed.code === "FORBIDDEN" ? 403 : 400);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("respond_swap", {
    p_token: token,
    p_request_id: id,
    p_owner_cancel_token_hash: hashSecret(parsed.value.cancelToken),
    p_accept: parsed.value.accept,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonOk({
    request: {
      id: row.request_id,
      status: row.status,
      resolution: row.resolution,
      resultBookingId: row.result_booking_id,
    },
  });
}
