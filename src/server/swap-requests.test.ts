import { describe, expect, it } from "vitest";
import {
  parseClientKeyBody,
  parseCreateRequestBody,
  parseRespondBody,
  toSwapRequestDto,
  type SwapRequestRow,
} from "./swap-requests";

describe("parseCreateRequestBody", () => {
  const valid = {
    targetBookingId: "b-1",
    serviceId: "corte",
    name: "  Pablo ",
    clientKey: "key-1",
  };

  it("acepta una petición válida y normaliza el nombre", () => {
    expect(parseCreateRequestBody(valid)).toEqual({
      ok: true,
      value: {
        targetBookingId: "b-1",
        serviceId: "corte",
        name: "Pablo",
        clientKey: "key-1",
      },
    });
  });

  it("el nombre es opcional (si ya tienes hora ese día se usa el tuyo)", () => {
    const withoutName = {
      targetBookingId: valid.targetBookingId,
      serviceId: valid.serviceId,
      clientKey: valid.clientKey,
    };
    const result = parseCreateRequestBody(withoutName);
    expect(result).toEqual({
      ok: true,
      value: { ...withoutName, name: null },
    });
  });

  it.each([
    ["sin cuerpo", null, "INVALID_REQUEST"],
    ["sin reserva destino", { ...valid, targetBookingId: "" }, "INVALID_REQUEST"],
    ["sin clientKey", { ...valid, clientKey: "" }, "INVALID_REQUEST"],
    ["servicio desconocido", { ...valid, serviceId: "tinte" }, "INVALID_SERVICE"],
    ["nombre vacío", { ...valid, name: "   " }, "INVALID_NAME"],
    ["nombre que no es texto", { ...valid, name: 3 }, "INVALID_NAME"],
  ] as const)("rechaza %s", (_label, body, code) => {
    expect(parseCreateRequestBody(body)).toEqual({ ok: false, code });
  });
});

describe("parseRespondBody", () => {
  it("acepta sí y no", () => {
    expect(parseRespondBody({ cancelToken: "t", accept: true })).toEqual({
      ok: true,
      value: { cancelToken: "t", accept: true },
    });
    expect(parseRespondBody({ cancelToken: "t", accept: false })).toEqual({
      ok: true,
      value: { cancelToken: "t", accept: false },
    });
  });

  it("sin token del dueño es FORBIDDEN, como al cancelar", () => {
    expect(parseRespondBody({ accept: true })).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("rechaza una respuesta que no es sí/no", () => {
    expect(parseRespondBody({ cancelToken: "t", accept: "yes" })).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
  });
});

describe("parseClientKeyBody", () => {
  it("lee el clientKey", () => {
    expect(parseClientKeyBody({ clientKey: "k" })).toEqual({
      ok: true,
      value: { clientKey: "k" },
    });
  });

  it("rechaza un cuerpo sin clientKey", () => {
    expect(parseClientKeyBody({})).toEqual({ ok: false, code: "INVALID_REQUEST" });
  });
});

describe("toSwapRequestDto", () => {
  const base: SwapRequestRow = {
    request_id: "r-1",
    role: "incoming",
    status: "pending",
    resolution: null,
    requester_name: "Pablo",
    owner_name: "Juan",
    slot_date: "2026-10-20",
    start_time: "16:30:00",
    swap_start_time: "18:00:00",
    service_id: "corte",
    result_booking_id: null,
    target_booking_id: "b-juan",
  };

  it("una petición recibida dice quién pide qué y si es intercambio", () => {
    expect(toSwapRequestDto(base)).toEqual({
      role: "incoming",
      id: "r-1",
      requesterName: "Pablo",
      date: "2026-10-20",
      startTime: "16:30",
      swapStartTime: "18:00",
      serviceId: "corte",
      targetBookingId: "b-juan",
    });
  });

  it("sin hora a cambio, swapStartTime es null (ceder)", () => {
    expect(toSwapRequestDto({ ...base, swap_start_time: null })).toMatchObject({
      swapStartTime: null,
    });
  });

  it("una petición enviada lleva estado y la reserva resultante", () => {
    expect(
      toSwapRequestDto({
        ...base,
        role: "outgoing",
        status: "accepted",
        resolution: "cede",
        result_booking_id: "b-new",
      }),
    ).toEqual({
      role: "outgoing",
      id: "r-1",
      ownerName: "Juan",
      date: "2026-10-20",
      startTime: "16:30",
      swapStartTime: "18:00",
      serviceId: "corte",
      status: "accepted",
      resolution: "cede",
      resultBookingId: "b-new",
      targetBookingId: "b-juan",
    });
  });
});
