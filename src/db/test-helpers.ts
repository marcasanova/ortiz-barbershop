import { hashSecret } from "@/lib/crypto";
import { createServiceClient } from "./client";

export const TEST_DATE = "2026-10-20";
export const OTHER_DATE = "2026-10-21";

export async function createOpenWeek() {
  const supabase = createServiceClient();
  const token = `test-${crypto.randomUUID()}`;

  await supabase
    .from("weeks")
    .update({ is_active: false, public_token: null })
    .eq("is_active", true);

  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .insert({ public_token: token, is_active: true })
    .select()
    .single();

  if (weekError || !week) {
    throw new Error(weekError?.message ?? "No se pudo crear la semana de test");
  }

  const { data: windows, error: windowsError } = await supabase
    .from("availability_windows")
    .insert([
      {
        week_id: week.id,
        date: TEST_DATE,
        start_time: "16:00",
        end_time: "20:00",
      },
      {
        week_id: week.id,
        date: OTHER_DATE,
        start_time: "16:00",
        end_time: "20:00",
      },
    ])
    .select("id, date");

  if (windowsError || !windows) {
    throw new Error(windowsError?.message ?? "No se pudieron crear las franjas");
  }

  const sameDayWindow = windows.find((window) => window.date === TEST_DATE);
  const otherDayWindow = windows.find((window) => window.date === OTHER_DATE);

  if (!sameDayWindow || !otherDayWindow) {
    throw new Error("No se pudieron localizar las franjas de test");
  }

  return {
    supabase,
    week,
    token,
    sameDayWindow,
    otherDayWindow,
  };
}

export async function deleteWeek(
  supabase: ReturnType<typeof createServiceClient>,
  weekId: string,
) {
  await supabase.from("weeks").delete().eq("id", weekId);
}

export async function bookSlot(params: {
  supabase: ReturnType<typeof createServiceClient>;
  token: string;
  serviceId: "corte" | "corte_barba";
  date: string;
  startTime: string;
  name: string;
  clientKey: string;
  cancelToken: string;
}) {
  return params.supabase.rpc("book_slot", {
    p_token: params.token,
    p_service_id: params.serviceId,
    p_date: params.date,
    p_start_time: params.startTime,
    p_client_name: params.name,
    p_client_key_hash: hashSecret(params.clientKey),
    p_cancel_token_hash: hashSecret(params.cancelToken),
  });
}

export function rpcMessage(error: { message: string } | null) {
  return error?.message ?? "";
}

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function requestSwap(params: {
  supabase: ServiceClient;
  token: string;
  targetBookingId: string;
  serviceId: "corte" | "corte_barba";
  name: string | null;
  clientKey: string;
  cancelToken: string;
}) {
  return params.supabase.rpc("request_swap", {
    p_token: params.token,
    p_target_booking_id: params.targetBookingId,
    p_service_id: params.serviceId,
    p_name: params.name,
    p_key_hash: hashSecret(params.clientKey),
    p_cancel_token_hash: hashSecret(params.cancelToken),
  });
}

export async function respondSwap(params: {
  supabase: ServiceClient;
  token: string;
  requestId: string;
  ownerCancelToken: string;
  accept: boolean;
}) {
  return params.supabase.rpc("respond_swap", {
    p_token: params.token,
    p_request_id: params.requestId,
    p_owner_cancel_token_hash: hashSecret(params.ownerCancelToken),
    p_accept: params.accept,
  });
}

export async function cancelSwapRequest(params: {
  supabase: ServiceClient;
  token: string;
  requestId: string;
  clientKey: string;
}) {
  return params.supabase.rpc("cancel_swap_request", {
    p_token: params.token,
    p_request_id: params.requestId,
    p_key_hash: hashSecret(params.clientKey),
  });
}

export async function mySwapRequests(params: {
  supabase: ServiceClient;
  token: string;
  clientKey: string;
}) {
  return params.supabase.rpc("my_swap_requests", {
    p_token: params.token,
    p_key_hash: hashSecret(params.clientKey),
  });
}

export async function cancelBooking(params: {
  supabase: ServiceClient;
  token: string;
  bookingId: string;
  cancelToken: string;
}) {
  return params.supabase.rpc("cancel_booking_by_token", {
    p_token: params.token,
    p_booking_id: params.bookingId,
    p_cancel_token_hash: hashSecret(params.cancelToken),
  });
}
