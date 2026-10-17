const KEY = "ob_client_key";
const NAME = "ob_display_name";
const TOKENS = "ob_cancel_tokens";

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

export function getCancelToken(bookingId: string): string | undefined {
  const raw = readStorage()?.getItem(TOKENS);
  if (!raw) {
    return undefined;
  }

  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[bookingId];
  } catch {
    return undefined;
  }
}

export function saveCancelToken(bookingId: string, token: string) {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  let map: Record<string, string> = {};
  try {
    map = JSON.parse(storage.getItem(TOKENS) ?? "{}") as Record<string, string>;
  } catch {
    map = {};
  }

  map[bookingId] = token;
  storage.setItem(TOKENS, JSON.stringify(map));
}

export function removeCancelToken(bookingId: string) {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  let map: Record<string, string> = {};
  try {
    map = JSON.parse(storage.getItem(TOKENS) ?? "{}") as Record<string, string>;
  } catch {
    map = {};
  }

  delete map[bookingId];
  storage.setItem(TOKENS, JSON.stringify(map));
}
