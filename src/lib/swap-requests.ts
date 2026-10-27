import { fitsAt } from "@/domain/slots";
import type { PublicBooking } from "./day-slots";

// Decisiones de la pantalla sobre peticiones de hora, sin React.

export type RequestState = "ok" | "own" | "pending" | "no-fit";

/** ¿Qué se puede hacer con una hora cogida del tablero? */
export function requestState(params: {
  booking: PublicBooking;
  day: { windows: { startTime: string; endTime: string }[]; bookings: PublicBooking[] };
  durationMinutes: number;
  myBookingId: string | null;
  pendingTargetIds: string[];
}): RequestState {
  const { booking, day, myBookingId } = params;

  if (booking.id === myBookingId) {
    return "own";
  }
  if (params.pendingTargetIds.includes(booking.id)) {
    return "pending";
  }

  // La hora del dueño (y la tuya, si es intercambio) quedan libres.
  const fits = fitsAt({
    windows: day.windows.map((window) => ({ start: window.startTime, end: window.endTime })),
    start: booking.startTime,
    durationMinutes: params.durationMinutes,
    busy: day.bookings.map((other) => ({
      id: other.id,
      start: other.startTime,
      end: other.endTime,
    })),
    excludeIds: myBookingId ? [booking.id, myBookingId] : [booking.id],
  });

  return fits ? "ok" : "no-fit";
}

type OutgoingSummary = {
  id: string;
  ownerName: string;
  startTime: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  resolution: "swap" | "cede" | null;
};

export type Notice = { message: string; tone: "success" | "warn" };

/**
 * Avisos para las peticiones enviadas que se han resuelto desde la última
 * carga. `previous` es el estado anterior por id (null en la primera carga).
 */
export function outgoingNotices(
  previous: Record<string, OutgoingSummary["status"]> | null,
  next: OutgoingSummary[],
): Notice[] {
  if (!previous) {
    return [];
  }

  const notices: Notice[] = [];
  for (const request of next) {
    if (previous[request.id] !== "pending" || request.status === "pending") {
      continue;
    }

    if (request.status === "accepted") {
      notices.push({
        message:
          request.resolution === "swap"
            ? `${request.ownerName} ha cambiado su hora contigo: ahora vas a las ${request.startTime}`
            : `${request.ownerName} te ha dado las ${request.startTime}`,
        tone: "success",
      });
    } else if (request.status === "declined") {
      notices.push({ message: `${request.ownerName} prefiere quedarse su hora`, tone: "warn" });
    } else if (request.status === "expired") {
      notices.push({
        message: `Tu petición a ${request.ownerName} ya no vale: su hora ha cambiado`,
        tone: "warn",
      });
    }
  }
  return notices;
}
