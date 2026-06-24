export async function onRequestGet({ env, params }) {
  const raw = await env.SHORT_LINKS.get(params.code);
  if (!raw) {
    return new Response(
      "<h1>404</h1><p>Link nahi mila ya expire ho gaya.</p>",
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }
  let url = raw;
  try { url = JSON.parse(raw).url || raw; } catch {}
  return Response.redirect(url, 302);
}
