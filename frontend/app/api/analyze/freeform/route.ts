export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  try {
    const body = await req.json();
    // forward optional keys from the incoming request (so frontend can pass Gemini/OpenAI keys)
    const forwardHeaders: Record<string,string> = { "content-type": "application/json" };
    try {
      const incomingKey = req.headers.get("x-gemini-key") || req.headers.get("x-openai-key");
      if (incomingKey) {
        // prefer forwarding explicit gemini header if present
        if (req.headers.get("x-gemini-key")) forwardHeaders["x-gemini-key"] = req.headers.get("x-gemini-key")!;
        if (req.headers.get("x-openai-key")) forwardHeaders["x-openai-key"] = req.headers.get("x-openai-key")!;
      }
    } catch (err) {
      // ignore header read errors
    }

    let r: Response;
    try {
      r = await fetch(`${base}/api/analyze/freeform`, {
        method: "POST",
        headers: forwardHeaders,
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (netErr) {
      return new Response(JSON.stringify({ error: `Backend fetch failed: ${String(netErr)}` }), { status: 502, headers: { "content-type": "application/json" } });
    }
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.ok ? 200 : r.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
