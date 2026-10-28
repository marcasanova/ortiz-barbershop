import { SERVICES, type ServiceId } from "@/domain/services";

export function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isServiceId(id: string): id is ServiceId {
  return id in SERVICES;
}

/** Nombre del servicio; `short` para el selector, celdas y listas densas. */
export function serviceName(id: string, variant: "full" | "short" = "full") {
  if (!isServiceId(id)) {
    return id;
  }
  return variant === "short" ? SERVICES[id].shortLabel : SERVICES[id].label;
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

/** "30" para "2026-10-30". */
export function formatDayNumber(date: string) {
  return String(Number(date.slice(8, 10)));
}

/** "30 minutos", "1 hora", "1 hora y 30 minutos". */
export function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = hours === 1 ? "1 hora" : `${hours} horas`;
  if (hours === 0) {
    return `${rest} minutos`;
  }
  return rest === 0 ? hourText : `${hourText} y ${rest} minutos`;
}
