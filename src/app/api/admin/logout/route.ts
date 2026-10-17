import { clearAdminCookie } from "@/server/admin-session";
import { jsonEmpty } from "@/server/http";


export async function POST() {
  await clearAdminCookie();
  return jsonEmpty(204);
}
