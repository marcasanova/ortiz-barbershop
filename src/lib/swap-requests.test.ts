import { describe, expect, it } from "vitest";
import { outgoingNotices, requestState } from "./swap-requests";

const windows = [{ startTime: "16:00", endTime: "20:00" }];
const juan = { id: "b-juan", clientName: "Juan", serviceId: "corte", startTime: "16:30", endTime: "17:00" };
const ana = { id: "b-ana", clientName: "Ana", serviceId: "corte", startTime: "17:00", endTime: "17:30" };
const mine = { id: "b-mio", clientName: "Pablo", serviceId: "corte", startTime: "18:00", endTime: "18:30" };

describe("requestState", () => {
  it("se puede pedir una hora ajena donde cabe tu corte", () => {
    expect(
      requestState({
        booking: juan,
        day: { windows, bookings: [juan, ana] },
        durationMinutes: 30,
        myBookingId: null,
        pendingTargetIds: [],
      }),
    ).toBe("ok");
  });

  it("tu propia hora no se pide", () => {
    expect(
      requestState({
        booking: mine,
        day: { windows, bookings: [mine] },
        durationMinutes: 30,
        myBookingId: "b-mio",
        pendingTargetIds: [],
      }),
    ).toBe("own");
  });

  it("si ya la has pedido, queda como pedida", () => {
    expect(
      requestState({
        booking: juan,
        day: { windows, bookings: [juan] },
        durationMinutes: 30,
        myBookingId: null,
        pendingTargetIds: ["b-juan"],
      }),
    ).toBe("pending");
  });

  it("un corte vintage (1 h) no cabe en las 16:30 de Juan si Ana va a las 17:00", () => {
    expect(
      requestState({
        booking: juan,
        day: { windows, bookings: [juan, ana] },
        durationMinutes: 60,
        myBookingId: null,
        pendingTargetIds: [],
      }),
    ).toBe("no-fit");
  });

  it("en un intercambio no cuenta tu propia reserva como estorbo", () => {
    const pegado = { ...mine, startTime: "17:00", endTime: "17:30" };
    expect(
      requestState({
        booking: juan,
        day: { windows, bookings: [juan, pegado] },
        durationMinutes: 60,
        myBookingId: "b-mio",
        pendingTargetIds: [],
      }),
    ).toBe("ok");
  });
});

describe("outgoingNotices", () => {
  const pending = {
    id: "r1",
    ownerName: "Juan",
    startTime: "16:30",
    status: "pending" as const,
    resolution: null,
  };

  it("en la primera carga no avisa de nada", () => {
    expect(outgoingNotices(null, [{ ...pending, status: "accepted", resolution: "cede" }])).toEqual([]);
  });

  it("avisa cuando te ceden la hora", () => {
    expect(
      outgoingNotices({ r1: "pending" }, [{ ...pending, status: "accepted", resolution: "cede" }]),
    ).toEqual([{ message: "Juan te ha dado las 16:30", tone: "success" }]);
  });

  it("avisa cuando aceptan el intercambio", () => {
    expect(
      outgoingNotices({ r1: "pending" }, [{ ...pending, status: "accepted", resolution: "swap" }]),
    ).toEqual([{ message: "Juan ha cambiado su hora contigo: ahora vas a las 16:30", tone: "success" }]);
  });

  it("avisa si dice que no o si la petición caduca", () => {
    expect(outgoingNotices({ r1: "pending" }, [{ ...pending, status: "declined" }])).toEqual([
      { message: "Juan prefiere quedarse su hora", tone: "warn" },
    ]);
    expect(outgoingNotices({ r1: "pending" }, [{ ...pending, status: "expired" }])).toEqual([
      { message: "Tu petición a Juan ya no vale: su hora ha cambiado", tone: "warn" },
    ]);
  });

  it("no repite avisos de algo que ya estaba resuelto", () => {
    expect(
      outgoingNotices({ r1: "declined" }, [{ ...pending, status: "declined" }]),
    ).toEqual([]);
  });
});
