import { requireAdmin } from "@/server/admin-session";
import { jsonOk } from "@/server/http";


export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  return jsonOk({ ok: true });
}
