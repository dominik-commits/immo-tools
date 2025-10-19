export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    ts: Date.now(),
    url: req.url,
    message: "✅ Serverless Function is alive"
  });
}