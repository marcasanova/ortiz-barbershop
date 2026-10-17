import {
  createSessionValue,
  pinMatches,
  setAdminCookie,
} from "@/server/admin-session";
import { jsonError, jsonOk } from "@/server/http";


export async function POST(request: Request) {
  let body: { pin?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_PIN", 401);
  }

  if (typeof body.pin !== "string" || !pinMatches(body.pin)) {
    return jsonError("INVALID_PIN", 401);
  }

  await setAdminCookie(createSessionValue());
  return jsonOk({ ok: true });
}
