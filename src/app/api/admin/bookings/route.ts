import { createServiceClient } from "@/db/client";
import { parseBookingBody } from "@/server/admin-bookings";
import { latestWeekId } from "@/server/admin-latest-week";
import { requireAdmin } from "@/server/admin-session";
import { jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";

// Raúl añade un cliente a mano.
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseBookingBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const latest = await latestWeekId();
  if ("error" in latest) {
    return latest.error;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("admin_create_booking", {
    p_week_id: latest.weekId,
    p_name: parsed.value.name,
    p_service_id: parsed.value.serviceId,
    p_date: parsed.value.date,
    p_start_time: parsed.value.startTime,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonOk({ id: data }, 201);
}
