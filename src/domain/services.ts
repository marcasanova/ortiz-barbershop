export const SERVICES = {
  corte: { id: "corte", label: "Corte", durationMinutes: 30 },
  corte_barba: {
    id: "corte_barba",
    label: "Corte + barba",
    durationMinutes: 40,
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

export function getService(id: string) {
  if (id !== "corte" && id !== "corte_barba") {
    throw new Error("INVALID_SERVICE");
  }

  return SERVICES[id];
}
