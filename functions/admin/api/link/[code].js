export async function onRequestPut({ request, env, params }) {
  const raw = await env.SHORT_LINKS.get(params.code);
  if (!raw) return res({ error: "Link nahi mila" }, 404);

  let stored;
  try { stored = JSON.parse(raw); }
  catch { stored = { url: raw, createdAt: null, expiresAt: null }; }

  // Normalize legacy entries that have no expiresAt
  if (!stored.expiresAt) {
    stored.expiresAt = Math.floor(Date.now() / 1000) + 31536000;
  }

  let body;
  try { body = await request.json(); }
  catch { return res({ error: "Invalid body" }, 400); }

  if (body.url !== undefined) {
    let url = body.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { return res({ error: "Invalid URL" }, 400); }
    stored.url = url;
  }

  if (body.addYears !== undefined) {
    stored.expiresAt += body.addYears * 31536000;
    if (stored.expiresAt <= Math.floor(Date.now() / 1000))
      return res({ error: "Expiry past mein nahi ho sakti" }, 400);
  }

  await env.SHORT_LINKS.put(
    params.code,
    JSON.stringify(stored),
    { expiration: stored.expiresAt }
  );
  return res({ ok: true, ...stored });
}

export async function onRequestDelete({ env, params }) {
  await env.SHORT_LINKS.delete(params.code);
  return res({ ok: true });
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });
}
