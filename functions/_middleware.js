export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/admin")) {
    return next();
  }

  const expected = "Basic " + btoa("admin:" + env.ADMIN_PASSWORD);
  const auth = request.headers.get("Authorization");

  if (auth !== expected) {
    return new Response("Login required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' }
    });
  }

  return next();
}