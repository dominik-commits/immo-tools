// api/ping.mjs
export const config = { runtime: 'nodejs20.x' };

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    ts: Date.now(),
    url: req.url,
    message: '✅ ESM Serverless Function is alive'
  });
}
