import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashSecret } from "@/lib/crypto";
import {
  TEST_DATE,
  bookSlot,
  createOpenWeek,
  deleteWeek,
  rpcMessage,
} from "./test-helpers";

type Fixture = Awaited<ReturnType<typeof createOpenWeek>>;

describe("cancel_booking", () => {
  let fixture: Fixture;
  let bookingId: string;

  beforeEach(async () => {
    fixture = await createOpenWeek();
    const { data, error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });
    if (error || !data?.[0]) {
      throw new Error(error?.message ?? "No se pudo crear la reserva de test");
    }
    bookingId = data[0].booking_id;
  });

  afterEach(async () => {
    if (fixture) {
      await deleteWeek(fixture.supabase, fixture.week.id);
    }
  });

  it("borra la reserva si el token de cancelación coincide", async () => {
    const { error } = await fixture.supabase.rpc("cancel_booking_by_token", {
      p_token: fixture.token,
      p_booking_id: bookingId,
      p_cancel_token_hash: hashSecret("cancel-a"),
    });

    expect(error).toBeNull();

    const { count } = await fixture.supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("id", bookingId);

    expect(count).toBe(0);
  });

  it("rechaza un token de cancelación ajeno con FORBIDDEN", async () => {
    const { error } = await fixture.supabase.rpc("cancel_booking_by_token", {
      p_token: fixture.token,
      p_booking_id: bookingId,
      p_cancel_token_hash: hashSecret("otro"),
    });

    expect(rpcMessage(error)).toContain("FORBIDDEN");

    const { count } = await fixture.supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("id", bookingId);

    expect(count).toBe(1);
  });

  it("permite a Raúl cancelar cualquier reserva", async () => {
    const { error } = await fixture.supabase.rpc("admin_cancel_booking", {
      p_booking_id: bookingId,
    });

    expect(error).toBeNull();

    const { count } = await fixture.supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("id", bookingId);

    expect(count).toBe(0);
  });

  it("no deja cancelar con el enlace antiguo", async () => {
    await fixture.supabase.rpc("rotate_public_link", {
      p_week_id: fixture.week.id,
    });

    const { error } = await fixture.supabase.rpc("cancel_booking_by_token", {
      p_token: fixture.token,
      p_booking_id: bookingId,
      p_cancel_token_hash: hashSecret("cancel-a"),
    });

    expect(rpcMessage(error)).toContain("LINK_EXPIRED");
  });
});
