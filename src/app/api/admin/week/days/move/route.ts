import { createServiceClient } from "@/db/client";
import { parseMoveDayBody } from "@/server/admin-bookings";
import { latestWeekId } from "@/server/admin-latest-week";
import { requireAdmin } from "@/server/admin-session";
import { jsonEmpty, jsonError } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";

// Mueve un día entero, con su horario y sus clientes, a otra fecha.
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = parseMoveDayBody(await request.json().catch(() => null));
  if (!parsed.ok) {
    return jsonError(parsed.code, 400);
  }

  const latest = await latestWeekId();
  if ("error" in latest) {
    return latest.error;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_move_day", {
    p_week_id: latest.weekId,
    p_from: parsed.value.from,
    p_to: parsed.value.to,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
