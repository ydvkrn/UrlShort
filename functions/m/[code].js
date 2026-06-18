export async function onRequestGet(context) {
  const { env, params } = context;
  const code = params.code;

  const url = await env.SHORT_LINKS.get(code);

  if (!url) {
    return new Response(
      "<h1>404</h1><p>Yeh link nahi mila ya expire ho gaya hai.</p>",
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  return Response.redirect(url, 302);
}