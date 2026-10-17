import { createServiceClient } from "@/db/client";
import { requireAdmin } from "@/server/admin-session";
import { windowsToRpcPayload, type WindowInput } from "@/server/admin-week";
import { jsonEmpty, jsonError, jsonOk } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";


async function latestWeekId() {
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

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  let body: { date?: unknown; windows?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_RANGE", 400);
  }

  if (typeof body.date !== "string" || !Array.isArray(body.windows)) {
    return jsonError("INVALID_RANGE", 400);
  }

  const windows = body.windows as WindowInput[];
  for (const window of windows) {
    if (
      typeof window?.startTime !== "string" ||
      typeof window?.endTime !== "string"
    ) {
      return jsonError("INVALID_RANGE", 400);
    }
  }

  const latest = await latestWeekId();
  if ("error" in latest) {
    return latest.error;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("replace_day_windows", {
    p_week_id: latest.weekId,
    p_date: body.date,
    p_windows: windowsToRpcPayload(windows),
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonOk({ ok: true });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const date = new URL(request.url).searchParams.get("date");
  if (!date) {
    return jsonError("INVALID_RANGE", 400);
  }

  const latest = await latestWeekId();
  if ("error" in latest) {
    return latest.error;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("replace_day_windows", {
    p_week_id: latest.weekId,
    p_date: date,
    p_windows: [],
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
