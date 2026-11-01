import { createServiceClient } from "@/db/client";
import { requireAdmin } from "@/server/admin-session";
import { mapWeekList, type WeekListRow } from "@/server/admin-week";
import { jsonError, jsonOk } from "@/server/http";

// Semanas para el selector del panel.
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createServiceClient();
  const [{ data: weeks, error }, { data: windows }] = await Promise.all([
    supabase.from("weeks").select("id, is_active, created_at"),
    supabase.from("availability_windows").select("week_id, date"),
  ]);

  if (error) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonOk({
    weeks: mapWeekList((weeks ?? []) as WeekListRow[], windows ?? []),
  });
}
