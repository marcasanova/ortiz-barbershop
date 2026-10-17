import { createServiceClient } from "@/db/client";
import { hashSecret } from "@/lib/crypto";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";


export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;

  let body: { cancelToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("FORBIDDEN", 403);
  }

  if (typeof body.cancelToken !== "string" || body.cancelToken.length < 1) {
    return jsonError("FORBIDDEN", 403);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("cancel_booking_by_token", {
    p_token: token,
    p_booking_id: id,
    p_cancel_token_hash: hashSecret(body.cancelToken),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
