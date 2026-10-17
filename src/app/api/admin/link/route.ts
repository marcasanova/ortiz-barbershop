import { createServiceClient } from "@/db/client";
import { buildPublicUrl } from "@/domain/url";
import { requireAdmin } from "@/server/admin-session";
import { jsonError, jsonOk } from "@/server/http";
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

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const latest = await latestWeekId();
  if ("error" in latest) {
    return latest.error;
  }

  const supabase = createServiceClient();
  const { data: token, error } = await supabase.rpc("rotate_public_link", {
    p_week_id: latest.weekId,
  });

  if (error || typeof token !== "string") {
    return rpcErrorToResponse(error);
  }

  const origin = new URL(request.url).origin;
  return jsonOk({ url: buildPublicUrl(origin, token) });
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createServiceClient();
  const { data: week, error } = await supabase
    .from("weeks")
    .select("public_token")
    .eq("is_active", true)
    .not("public_token", "is", null)
    .maybeSingle();

  if (error) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  if (!week?.public_token) {
    return jsonError("NOT_FOUND", 404);
  }

  const origin = new URL(request.url).origin;
  return jsonOk({ url: buildPublicUrl(origin, week.public_token) });
}
