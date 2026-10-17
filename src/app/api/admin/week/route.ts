import { createServiceClient } from "@/db/client";
import { requireAdmin } from "@/server/admin-session";
import { mapAdminWeek, type DbBooking, type DbWindow } from "@/server/admin-week";
import { jsonError, jsonOk } from "@/server/http";


export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weeks")
    .insert({ is_active: false, public_token: null })
    .select("id")
    .single();

  if (error || !data) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonOk({ id: data.id }, 201);
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createServiceClient();
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id, public_token, is_active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weekError) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  if (!week) {
    return jsonError("NOT_FOUND", 404);
  }

  const [{ data: windows }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability_windows")
      .select("id, date, start_time, end_time")
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
    mapAdminWeek({
      week,
      windows: (windows ?? []) as DbWindow[],
      bookings: (bookings ?? []) as DbBooking[],
    }),
  );
}
