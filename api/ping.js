export default function handler(request, response) {
  return new Response(
    JSON.stringify({
      ok: true,
      ts: Date.now(),
      url: request.url,
    }),
    {
      headers: { "content-type": "application/json" },
      status: 200,
    }
  );
}
