export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return res({ error: "Invalid body" }, 400); }

  let url = (body.url || "").trim();
  if (!url) return res({ error: "URL chahiye" }, 400);
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try { new URL(url); } catch { return res({ error: "Invalid URL" }, 400); }

  let code;
  try { code = await uniqueCode(env.SHORT_LINKS); }
  catch { return res({ error: "Try again later" }, 500); }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 31536000;
  await env.SHORT_LINKS.put(
    code,
    JSON.stringify({ url, createdAt: now, expiresAt }),
    { expiration: expiresAt }
  );

  return res({ shortUrl: new URL(request.url).origin + "/m/" + code, code });
}

function res(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });
}

async function uniqueCode(kv) {
  const lo = "abcdefghijklmnopqrstuvwxyz";
  const up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r  = (n) => Math.floor(Math.random() * n);
  for (let i = 0; i < 20; i++) {
    const code = `${r(10)}${lo[r(26)]}${up[r(26)]}${r(89) + 11}`;
    if (!await kv.get(code)) return code;
  }
  throw new Error("Exhausted");
}
