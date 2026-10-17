import { SERVICES, type ServiceId } from "@/domain/services";

export function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function serviceLabel(id: string) {
  if (id === "corte" || id === "corte_barba") {
    const service = SERVICES[id as ServiceId];
    return `${service.label} (${service.durationMinutes} min)`;
  }
  return id;
}

/** "sáb 18" para chips. */
export function formatDayShort(date: string) {
  const day = new Date(`${date}T12:00:00`);
  const weekday = day
    .toLocaleDateString("es-ES", { weekday: "short" })
    .replace(".", "");
  return `${weekday} ${day.getDate()}`;
}

/** "18 oct" */
export function formatDayMonth(date: string) {
  return new Date(`${date}T12:00:00`)
    .toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function formatWeekday(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
  });
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
