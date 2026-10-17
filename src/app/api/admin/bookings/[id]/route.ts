import { createServiceClient } from "@/db/client";
import { requireAdmin } from "@/server/admin-session";
import { jsonEmpty } from "@/server/http";
import { rpcErrorToResponse } from "@/server/rpc";


export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("admin_cancel_booking", {
    p_booking_id: id,
  });

  if (error) {
    return rpcErrorToResponse(error);
  }

  return jsonEmpty(204);
}
