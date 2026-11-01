import { createServiceClient } from "@/db/client";
import { parseSwapBody } from "@/server/admin-bookings";
import { requireAdmin } from "@/server/admin-session";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";

// Raúl intercambia las horas de dos clientes.
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseSwapBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_swap_bookings", {
    p_booking_a: parsed.value.bookingA,
    p_booking_b: parsed.value.bookingB,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
