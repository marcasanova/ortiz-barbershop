/** Normaliza `16:00:00` o `16:00` a `HH:mm`. */
export function toHhMm(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return value;
  }
  return `${match[1]}:${match[2]}`;
}
