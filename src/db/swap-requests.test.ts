import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TEST_DATE,
  bookSlot,
  cancelBooking,
  cancelSwapRequest,
  createOpenWeek,
  deleteWeek,
  mySwapRequests,
  requestSwap,
  respondSwap,
  rpcMessage,
} from "./test-helpers";

type Fixture = Awaited<ReturnType<typeof createOpenWeek>>;

// Juan (dueño) tiene las 16:30. Pablo quiere esa hora.
describe("swap_requests", () => {
  let fixture: Fixture;
  let juanBookingId: string;

  async function book(name: string, startTime: string, key: string, serviceId: "corte" | "corte_barba" = "corte") {
    const { data, error } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId,
      date: TEST_DATE,
      startTime,
      name,
      clientKey: `client-${key}`,
      cancelToken: `cancel-${key}`,
    });
    if (error || !data?.[0]) {
      throw new Error(error?.message ?? "No se pudo crear la reserva de test");
    }
    return data[0].booking_id as string;
  }

  async function ask(params: {
    target?: string;
    key?: string;
    name?: string | null;
    serviceId?: "corte" | "corte_barba";
  } = {}) {
    return requestSwap({
      supabase: fixture.supabase,
      token: fixture.token,
      targetBookingId: params.target ?? juanBookingId,
      serviceId: params.serviceId ?? "corte",
      name: params.name === undefined ? "Pablo" : params.name,
      clientKey: `client-${params.key ?? "pablo"}`,
      cancelToken: `request-${params.key ?? "pablo"}`,
    });
  }

  async function askOk(params: Parameters<typeof ask>[0] = {}) {
    const { data, error } = await ask(params);
    if (error || !data?.[0]) {
      throw new Error(error?.message ?? "No se pudo crear la petición de test");
    }
    return data[0].request_id as string;
  }

  async function answer(requestId: string, accept: boolean, ownerKey = "juan") {
    return respondSwap({
      supabase: fixture.supabase,
      token: fixture.token,
      requestId,
      ownerCancelToken: `cancel-${ownerKey}`,
      accept,
    });
  }

  async function bookingsOfDay() {
    const { data } = await fixture.supabase
      .from("bookings")
      .select("id, client_name, start_time, end_time, service_id")
      .eq("week_id", fixture.week.id)
      .eq("slot_date", TEST_DATE)
      .order("start_time");
    return data ?? [];
  }

  async function requestRow(id: string) {
    const { data } = await fixture.supabase
      .from("swap_requests")
      .select("status, resolution, result_booking_id")
      .eq("id", id)
      .single();
    return data;
  }

  beforeEach(async () => {
    fixture = await createOpenWeek();
    juanBookingId = await book("Juan", "16:30", "juan");
  });

  afterEach(async () => {
    if (fixture) {
      await deleteWeek(fixture.supabase, fixture.week.id);
    }
  });

  describe("pedir", () => {
    it("crea una petición pendiente", async () => {
      const requestId = await askOk();
      expect(await requestRow(requestId)).toMatchObject({ status: "pending", resolution: null });
    });

    it("no deja pedir tu propia hora", async () => {
      const { error } = await ask({ key: "juan", name: "Juan" });
      expect(rpcMessage(error)).toContain("CANNOT_REQUEST_OWN");
    });

    it("no deja repetir una petición pendiente", async () => {
      await askOk();
      const { error } = await ask();
      expect(rpcMessage(error)).toContain("REQUEST_ALREADY_PENDING");
    });

    it("sin hora ese día hace falta un nombre válido", async () => {
      const { error } = await ask({ name: null });
      expect(rpcMessage(error)).toContain("INVALID_NAME");
    });

    it("no deja usar un nombre que ya tiene hora ese día", async () => {
      await book("Luis", "18:00", "luis");
      const { error } = await ask({ name: "luis" });
      expect(rpcMessage(error)).toContain("NAME_TAKEN_THAT_DAY");
    });

    it("rechaza pedir un corte + barba que no cabe en el hueco", async () => {
      await book("Ana", "17:00", "ana");
      const { error } = await ask({ serviceId: "corte_barba" });
      expect(rpcMessage(error)).toContain("REQUEST_DOES_NOT_FIT");
    });

    it("rechaza un enlace caducado", async () => {
      const { error } = await requestSwap({
        supabase: fixture.supabase,
        token: "token-que-no-existe",
        targetBookingId: juanBookingId,
        serviceId: "corte",
        name: "Pablo",
        clientKey: "client-pablo",
        cancelToken: "request-pablo",
      });
      expect(rpcMessage(error)).toContain("LINK_EXPIRED");
    });
  });

  describe("responder", () => {
    it("rechazar deja las reservas como estaban", async () => {
      const requestId = await askOk();
      const { error } = await answer(requestId, false);
      expect(error).toBeNull();
      expect(await requestRow(requestId)).toMatchObject({ status: "declined" });
      expect((await bookingsOfDay()).map((b) => b.client_name)).toEqual(["Juan"]);
    });

    it("intercambio: cada uno se queda con la hora del otro y su mismo id", async () => {
      const pabloBookingId = await book("Pablo", "18:00", "pablo");
      const requestId = await askOk();

      const { error } = await answer(requestId, true);
      expect(error).toBeNull();
      expect(await requestRow(requestId)).toMatchObject({
        status: "accepted",
        resolution: "swap",
        result_booking_id: pabloBookingId,
      });

      const day = await bookingsOfDay();
      expect(day.map((b) => [b.id, b.client_name, b.start_time])).toEqual([
        [pabloBookingId, "Pablo", "16:30:00"],
        [juanBookingId, "Juan", "18:00:00"],
      ]);

      // Los tokens que cada navegador ya tenía siguen sirviendo.
      const pabloCancel = await cancelBooking({
        supabase: fixture.supabase,
        token: fixture.token,
        bookingId: pabloBookingId,
        cancelToken: "cancel-pablo",
      });
      expect(pabloCancel.error).toBeNull();
      const juanCancel = await cancelBooking({
        supabase: fixture.supabase,
        token: fixture.token,
        bookingId: juanBookingId,
        cancelToken: "cancel-juan",
      });
      expect(juanCancel.error).toBeNull();
    });

    it("intercambio: cada uno conserva la duración de su servicio", async () => {
      // Juan 16:30 corte (30). Pablo 18:00 corte + barba (40) y pide corte + barba.
      await book("Pablo", "18:00", "pablo", "corte_barba");
      const requestId = await askOk({ serviceId: "corte_barba" });
      await answer(requestId, true);

      const day = await bookingsOfDay();
      expect(day.map((b) => [b.client_name, b.start_time, b.end_time, b.service_id])).toEqual([
        ["Pablo", "16:30:00", "17:10:00", "corte_barba"],
        ["Juan", "18:00:00", "18:30:00", "corte"],
      ]);
    });

    it("ceder: el dueño se queda sin hora y quien pide entra con su propio token", async () => {
      const requestId = await askOk();
      const { error } = await answer(requestId, true);
      expect(error).toBeNull();

      const row = await requestRow(requestId);
      expect(row).toMatchObject({ status: "accepted", resolution: "cede" });

      const day = await bookingsOfDay();
      expect(day.map((b) => [b.client_name, b.start_time])).toEqual([["Pablo", "16:30:00"]]);
      expect(day[0].id).toBe(row?.result_booking_id);

      // Pablo puede liberar con el token que guardó al pedir.
      const cancel = await cancelBooking({
        supabase: fixture.supabase,
        token: fixture.token,
        bookingId: row?.result_booking_id as string,
        cancelToken: "request-pablo",
      });
      expect(cancel.error).toBeNull();
    });

    it("ceder: Juan puede volver a reservar a mano otra hora", async () => {
      const requestId = await askOk();
      await answer(requestId, true);
      await expect(book("Juan", "18:00", "juan")).resolves.toBeTruthy();
    });

    it("solo el dueño puede responder", async () => {
      const requestId = await askOk();
      const { error } = await answer(requestId, true, "pablo");
      expect(rpcMessage(error)).toContain("FORBIDDEN");
    });

    it("no se puede responder dos veces", async () => {
      const requestId = await askOk();
      await answer(requestId, false);
      const { error } = await answer(requestId, true);
      expect(rpcMessage(error)).toContain("REQUEST_NOT_PENDING");
    });

    it("si ya no cabe al aceptar (alguien reservó entre medias), falla y no toca nada", async () => {
      const requestId = await askOk({ serviceId: "corte_barba" });
      await book("Ana", "17:00", "ana");
      const { error } = await answer(requestId, true);
      expect(rpcMessage(error)).toContain("REQUEST_DOES_NOT_FIT");
      expect((await bookingsOfDay()).map((b) => b.client_name)).toEqual(["Juan", "Ana"]);
      expect(await requestRow(requestId)).toMatchObject({ status: "pending" });
    });

    it("al aceptar, las otras peticiones sobre esa hora caducan", async () => {
      const first = await askOk();
      const second = await askOk({ key: "luis", name: "Luis" });
      await answer(first, true);
      expect(await requestRow(second)).toMatchObject({ status: "expired" });
    });
  });

  describe("ciclo de vida", () => {
    it("si el dueño cancela su reserva, la petición caduca", async () => {
      const requestId = await askOk();
      await cancelBooking({
        supabase: fixture.supabase,
        token: fixture.token,
        bookingId: juanBookingId,
        cancelToken: "cancel-juan",
      });
      expect(await requestRow(requestId)).toMatchObject({ status: "expired" });
    });

    it("quien pide puede retirar la petición; otro no", async () => {
      const requestId = await askOk();
      const stranger = await cancelSwapRequest({
        supabase: fixture.supabase,
        token: fixture.token,
        requestId,
        clientKey: "client-luis",
      });
      expect(rpcMessage(stranger.error)).toContain("FORBIDDEN");

      const mine = await cancelSwapRequest({
        supabase: fixture.supabase,
        token: fixture.token,
        requestId,
        clientKey: "client-pablo",
      });
      expect(mine.error).toBeNull();
      expect(await requestRow(requestId)).toMatchObject({ status: "cancelled" });
    });

    it("my_swap_requests separa recibidas y enviadas, sin hashes", async () => {
      await book("Pablo", "18:00", "pablo");
      const requestId = await askOk();

      const juan = await mySwapRequests({
        supabase: fixture.supabase,
        token: fixture.token,
        clientKey: "client-juan",
      });
      expect(juan.error).toBeNull();
      expect(juan.data).toEqual([
        expect.objectContaining({
          request_id: requestId,
          role: "incoming",
          requester_name: "Pablo",
          start_time: "16:30:00",
          swap_start_time: "18:00:00",
          target_booking_id: juanBookingId,
        }),
      ]);
      expect(JSON.stringify(juan.data)).not.toContain("hash");

      const pablo = await mySwapRequests({
        supabase: fixture.supabase,
        token: fixture.token,
        clientKey: "client-pablo",
      });
      expect(pablo.data).toEqual([
        expect.objectContaining({
          request_id: requestId,
          role: "outgoing",
          owner_name: "Juan",
          status: "pending",
        }),
      ]);
    });
  });
});
