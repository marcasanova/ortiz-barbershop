import { createServiceClient } from "@/db/client";
import { parseBookingBody } from "@/server/admin-bookings";
import { requireAdmin } from "@/server/admin-session";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";

// Raúl cambia nombre, corte, día u hora de un cliente.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseBookingBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_update_booking", {
    p_booking_id: id,
    p_name: parsed.value.name,
    p_service_id: parsed.value.serviceId,
    p_date: parsed.value.date,
    p_start_time: parsed.value.startTime,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_cancel_booking", {
    p_booking_id: id,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
