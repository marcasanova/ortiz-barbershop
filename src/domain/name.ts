export function normalizeName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new Error("INVALID_NAME");
  }

  return trimmed;
}

export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase();
}
