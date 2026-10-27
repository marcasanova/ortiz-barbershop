import { createServiceClient } from "@/db/client";
import { hashSecret } from "@/lib/crypto";
import { jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";
import {
  parseClientKeyBody,
  toSwapRequestDto,
  type IncomingRequest,
  type OutgoingRequest,
  type SwapRequestRow,
} from "@/server/swap-requests";

// Peticiones de este navegador. POST para que el clientKey no viaje en la URL.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const parsed = parseClientKeyBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("my_swap_requests", {
    p_token: token,
    p_key_hash: hashSecret(parsed.value.clientKey),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  const incoming: IncomingRequest[] = [];
  const outgoing: OutgoingRequest[] = [];
  for (const row of (data ?? []) as SwapRequestRow[]) {
    const dto = toSwapRequestDto(row);
    if (dto.role === "incoming") {
      incoming.push(dto);
    } else {
      outgoing.push(dto);
    }
  }

  return jsonOk({ incoming, outgoing });
}
