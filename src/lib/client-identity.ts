const KEY = "ob_client_key";
const NAME = "ob_display_name";
const TOKENS = "ob_cancel_tokens";
const REQUEST_TOKENS = "ob_request_tokens";

function readStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export function getClientKey(): string {
  const storage = readStorage();
  if (!storage) {
    return "";
  }

  const existing = storage.getItem(KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  storage.setItem(KEY, created);
  return created;
}

export function getDisplayName(): string {
  return readStorage()?.getItem(NAME) ?? "";
}

export function setDisplayName(name: string) {
  readStorage()?.setItem(NAME, name);
}

function readTokenMap(key: string): Record<string, string> {
  const raw = readStorage()?.getItem(key);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeTokenMap(key: string, map: Record<string, string>) {
  readStorage()?.setItem(key, JSON.stringify(map));
}

export function getCancelToken(bookingId: string): string | undefined {
  return readTokenMap(TOKENS)[bookingId];
}

export function saveCancelToken(bookingId: string, token: string) {
  writeTokenMap(TOKENS, { ...readTokenMap(TOKENS), [bookingId]: token });
}

export function removeCancelToken(bookingId: string) {
  const map = readTokenMap(TOKENS);
  delete map[bookingId];
  writeTokenMap(TOKENS, map);
}

// Token de cancelación de la reserva que nacerá si aceptan una petición.
// Vive bajo el id de la petición hasta que se resuelve.
export function getRequestToken(requestId: string): string | undefined {
  return readTokenMap(REQUEST_TOKENS)[requestId];
}

export function saveRequestToken(requestId: string, token: string) {
  writeTokenMap(REQUEST_TOKENS, {
    ...readTokenMap(REQUEST_TOKENS),
    [requestId]: token,
  });
}

export function removeRequestToken(requestId: string) {
  const map = readTokenMap(REQUEST_TOKENS);
  delete map[requestId];
  writeTokenMap(REQUEST_TOKENS, map);
}

/** Pasa el token de la petición aceptada a la reserva nueva. */
export function takeRequestToken(requestId: string, bookingId: string): boolean {
  const token = getRequestToken(requestId);
  if (!token) {
    return false;
  }

  saveCancelToken(bookingId, token);
  removeRequestToken(requestId);
  return true;
}
