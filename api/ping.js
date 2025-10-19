export const config = {
  runtime: "edge", // läuft auf Edge Runtime, 100 % ESM-kompatibel
};

export default function handler(request) {
  return new Response(
    JSON.stringify({
      ok: true,
      ts: Date.now(),
      url: request.url,
      message: "Edge Function is alive ✅",
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
}
