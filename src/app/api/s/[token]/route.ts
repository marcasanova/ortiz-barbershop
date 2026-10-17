import { createServiceClient } from "@/db/client";
import { getService } from "@/domain/services";
import { jsonError, jsonOk } from "@/server/http";
import {
  buildPublicBoard,
  type BoardBooking,
  type BoardWindow,
} from "@/server/public-board";


export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const serviceId = new URL(request.url).searchParams.get("service");

  if (!serviceId) {
    return jsonError("INVALID_SERVICE", 400);
  }

  let service;
  try {
    service = getService(serviceId);
  } catch {
    return jsonError("INVALID_SERVICE", 400);
  }

  const supabase = createServiceClient();
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id")
    .eq("public_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (weekError) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  if (!week) {
    return jsonError("LINK_EXPIRED", 404);
  }

  const [{ data: windows }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability_windows")
      .select("date, start_time, end_time")
      .eq("week_id", week.id)
      .order("date")
      .order("start_time"),
    supabase
      .from("bookings")
      .select("id, slot_date, service_id, start_time, end_time, client_name")
      .eq("week_id", week.id)
      .order("slot_date")
      .order("start_time"),
  ]);

  return jsonOk(
    buildPublicBoard({
      service,
      windows: (windows ?? []) as BoardWindow[],
      bookings: (bookings ?? []) as BoardBooking[],
    }),
  );
}
