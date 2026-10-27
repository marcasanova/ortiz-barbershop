import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  OTHER_DATE,
  TEST_DATE,
  bookSlot,
  createOpenWeek,
  deleteWeek,
  rpcMessage,
} from "./test-helpers";

type Fixture = Awaited<ReturnType<typeof createOpenWeek>>;

describe("book_slot", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await createOpenWeek();
  });

  afterEach(async () => {
    if (fixture) {
      await deleteWeek(fixture.supabase, fixture.week.id);
    }
  });

  it("reserva un corte de 30 minutos en un hueco libre", async () => {
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

    expect(error).toBeNull();
    expect(data?.[0]?.client_name).toBe("Marc");

    const { count } = await fixture.supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("week_id", fixture.week.id)
      .eq("slot_date", TEST_DATE)
      .eq("start_time", "16:00:00");

    expect(count).toBe(1);
  });

  it("rechaza un corte vintage (1 h) que pisa uno de 30 con SLOT_TAKEN", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte_barba",
      date: TEST_DATE,
      startTime: "16:10",
      name: "Luis",
      clientKey: "client-b",
      cancelToken: "cancel-b",
    });

    expect(rpcMessage(error)).toContain("SLOT_TAKEN");
  });

  it("permite el vintage a las 16:30 si el corte de 30 acaba a las 16:30, y dura 1 h", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte_barba",
      date: TEST_DATE,
      startTime: "16:30",
      name: "Luis",
      clientKey: "client-b",
      cancelToken: "cancel-b",
    });

    expect(error).toBeNull();
    const { data } = await fixture.supabase
      .from("bookings")
      .select("end_time")
      .eq("week_id", fixture.week.id)
      .eq("client_name", "Luis")
      .single();
    expect(data?.end_time).toBe("17:30:00");
  });

  it("permite el vintage a las 19:00, la última hora entera de la franja", async () => {
    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte_barba",
      date: TEST_DATE,
      startTime: "19:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(error).toBeNull();
  });

  it("rechaza el vintage a las 19:10 porque la hora no cabe en la franja", async () => {
    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte_barba",
      date: TEST_DATE,
      startTime: "19:10",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(rpcMessage(error)).toContain("SLOT_TAKEN");
  });

  it("rechaza el vintage a las 19:30 porque no cabe en la franja", async () => {
    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte_barba",
      date: TEST_DATE,
      startTime: "19:30",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(rpcMessage(error)).toContain("SLOT_TAKEN");
  });

  it("rechaza el mismo nombre el mismo día con NAME_TAKEN_THAT_DAY", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "17:00",
      name: "MARC",
      clientKey: "client-b",
      cancelToken: "cancel-b",
    });

    expect(rpcMessage(error)).toContain("NAME_TAKEN_THAT_DAY");
  });

  it("rechaza al mismo navegador el mismo día con ALREADY_BOOKED_THAT_DAY", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "17:00",
      name: "Luis",
      clientKey: "client-a",
      cancelToken: "cancel-b",
    });

    expect(rpcMessage(error)).toContain("ALREADY_BOOKED_THAT_DAY");
  });

  it("rechaza un enlace invalidado con LINK_EXPIRED", async () => {
    await fixture.supabase.rpc("rotate_public_link", {
      p_week_id: fixture.week.id,
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(rpcMessage(error)).toContain("LINK_EXPIRED");
  });

  it("permite el mismo nombre en otro día", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    const { error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: OTHER_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-b",
      cancelToken: "cancel-b",
    });

    expect(error).toBeNull();
  });
});
