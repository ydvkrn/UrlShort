export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  let url = (body.url || "").trim();
  if (!url) {
    return jsonResponse({ error: "URL chahiye" }, 400);
  }

  // https:// missing ho to add kar dein
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return jsonResponse({ error: "Invalid URL" }, 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return jsonResponse({ error: "Invalid URL" }, 400);
  }

  let code;
  try {
    code = await generateUniqueCode(env.SHORT_LINKS);
  } catch {
    return jsonResponse({ error: "Try again later" }, 500);
  }

  // 1 saal (365 din) ke liye store karein
  await env.SHORT_LINKS.put(code, url, { expirationTtl: 31536000 });

  const shortUrl = new URL(request.url).origin + "/m/" + code;
  return jsonResponse({ shortUrl, code });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function generateUniqueCode(kv) {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < 20; i++) {
    const digit = Math.floor(Math.random() * 10);      // 0-9
    const l = lower[Math.floor(Math.random() * 26)];   // a-z
    const u = upper[Math.floor(Math.random() * 26)];   // A-Z
    const num = Math.floor(Math.random() * 89) + 11;   // 11-99
    const code = `${digit}${l}${u}${num}`;

    const exists = await kv.get(code);
    if (!exists) return code;
  }
  throw new Error("No code available");
}
