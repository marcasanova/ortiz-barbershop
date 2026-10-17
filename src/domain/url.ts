export function buildPublicUrl(origin: string, token: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/s/${token}`;
}
