// functions/api/shorten.js — Cloudflare Pages Function

export async function onRequestPost({ request, env }) {
  const cors = corsHeaders();

  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Request body must be valid JSON" }, 400, cors);
  }

  let url     = (body.url   ?? "").trim();
  const alias = (body.alias ?? "").trim().toLowerCase();

  if (!url) return respond({ error: "URL is required" }, 400, cors);

  // Auto-prefix https://
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  // Validate URL structure
  let parsed;
  try { parsed = new URL(url); }
  catch { return respond({ error: "That doesn't look like a valid URL" }, 400, cors); }

  // Block private / localhost URLs
  const { hostname } = parsed;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    hostname.endsWith(".local")
  ) {
    return respond({ error: "Private or local URLs are not allowed" }, 400, cors);
  }

  let code;

  if (alias) {
    if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(alias)) {
      return respond(
        { error: "Alias: 3-20 chars, letters/numbers/hyphens, no leading or trailing hyphens" },
        400, cors
      );
    }
    const existing = await env.SHORT_LINKS.get(alias);
    if (existing) {
      return respond({ error: "That alias is already taken — try another one" }, 409, cors);
    }
    code = alias;
  } else {
    try {
      code = await generateCode(env.SHORT_LINKS);
    } catch {
      return respond({ error: "Could not generate a link right now — please try again" }, 503, cors);
    }
  }

  const now       = Math.floor(Date.now() / 1000);
  const expiresAt = now + 365 * 24 * 60 * 60;

  await env.SHORT_LINKS.put(
    code,
    JSON.stringify({ url, code, createdAt: now, expiresAt, clicks: 0 }),
    { expiration: expiresAt }
  );

  const origin = new URL(request.url).origin;
  return respond({ shortUrl: `${origin}/m/${code}`, code, expiresAt }, 200, cors);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function respond(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

async function generateCode(kv) {
  // 6-char alphanumeric => 36^6 ~ 2.18 billion combinations
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 25; i++) {
    let code = "";
    for (let j = 0; j < 6; j++) code += chars[Math.floor(Math.random() * 36)];
    if (!(await kv.get(code))) return code;
  }
  throw new Error("Exhausted");
}