export function jsonOk(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export function jsonError(code: string, status: number) {
  return Response.json({ error: { code } }, { status });
}

export function jsonEmpty(status: number) {
  return new Response(null, { status });
}
