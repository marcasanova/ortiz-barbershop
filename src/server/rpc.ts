import { jsonError } from "./http";

const RPC_STATUS: Record<string, number> = {
  LINK_EXPIRED: 404,
  NOT_FOUND: 404,
  INVALID_NAME: 400,
  INVALID_SERVICE: 400,
  INVALID_PIN: 401,
  SLOT_TAKEN: 409,
  NAME_TAKEN_THAT_DAY: 409,
  ALREADY_BOOKED_THAT_DAY: 409,
  FORBIDDEN: 403,
};

export function extractRpcCode(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  for (const code of Object.keys(RPC_STATUS)) {
    if (message.includes(code)) {
      return code;
    }
  }

  return null;
}

export function rpcErrorToResponse(error: { message: string } | null) {
  const code = extractRpcCode(error?.message);
  if (!code) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  return jsonError(code, RPC_STATUS[code]);
}
