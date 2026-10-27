import { createServiceClient } from "@/db/client";
import { hashSecret } from "@/lib/crypto";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";
import { parseClientKeyBody } from "@/server/swap-requests";

// Quien pidió retira su petición.
export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;
  const parsed = parseClientKeyBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("cancel_swap_request", {
    p_token: token,
    p_request_id: id,
    p_key_hash: hashSecret(parsed.value.clientKey),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
