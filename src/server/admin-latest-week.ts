import { createServiceClient } from "@/db/client";
import { jsonError } from "./http";

/** La semana en edición: la última creada. */
export async function latestWeekId() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: jsonError("INTERNAL_ERROR", 500) as Response };
  }

  if (!data) {
    return { error: jsonError("NOT_FOUND", 404) as Response };
  }

  return { weekId: data.id as string };
}
