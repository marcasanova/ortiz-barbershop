// `corte_barba` es el id histórico del corte atemporal vintage: se mantiene
// para no tocar la base de datos (FK de reservas y peticiones).
export const SERVICES = {
  corte: { id: "corte", label: "Corte", shortLabel: "Corte", durationMinutes: 30 },
  corte_barba: {
    id: "corte_barba",
    label: "Corte atemporal vintage",
    shortLabel: "Vintage",
    durationMinutes: 60,
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

export function getService(id: string) {
  if (id !== "corte" && id !== "corte_barba") {
    throw new Error("INVALID_SERVICE");
  }

  return SERVICES[id];
}
