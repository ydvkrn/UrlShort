export async function onRequestGet({ env }) {
  const keys = [];
  let cursor;
  do {
    const r = await env.SHORT_LINKS.list(cursor ? { cursor } : {});
    keys.push(...r.keys);
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);

  const links = await Promise.all(keys.map(async k => {
    const raw = await env.SHORT_LINKS.get(k.name);
    let url = raw, createdAt = null, expiresAt = k.expiration || null;
    try {
      const d = JSON.parse(raw);
      url = d.url; createdAt = d.createdAt; expiresAt = d.expiresAt;
    } catch {}
    return { code: k.name, url, createdAt, expiresAt };
  }));

  return res(links);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return res({ error: "Invalid body" }, 400); }

  let url = (body.url || "").trim();
  const code = (body.code || "").trim();

  if (!url || !code) return res({ error: "Code aur URL dono chahiye" }, 400);
  if (!/^[a-zA-Z0-9_-]+$/.test(code))
    return res({ error: "Code mein sirf letters, numbers, - ya _ allowed hain" }, 400);
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try { new URL(url); } catch { return res({ error: "Invalid URL" }, 400); }
  if (await env.SHORT_LINKS.get(code))
    return res({ error: "Yeh code already use mein hai" }, 409);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 31536000;
  await env.SHORT_LINKS.put(
    code,
    JSON.stringify({ url, createdAt: now, expiresAt }),
    { expiration: expiresAt }
  );
  return res({ ok: true, code, expiresAt });
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });
}
