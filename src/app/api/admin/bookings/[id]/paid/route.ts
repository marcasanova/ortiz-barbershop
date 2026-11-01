import { createServiceClient } from "@/db/client";
import { parsePaidBody } from "@/server/admin-bookings";
import { requireAdmin } from "@/server/admin-session";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";

// Marca o desmarca un corte como pagado. También vale en semanas pasadas.
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parsePaidBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_set_paid", {
    p_booking_id: id,
    p_paid: parsed.value.paid,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
