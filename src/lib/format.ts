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
