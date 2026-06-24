export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/admin")) {
    return next();
  }

  const auth = request.headers.get("Authorization") || "";

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colon = decoded.indexOf(":");
      if (colon !== -1) {
        const user = decoded.slice(0, colon);
        const pass = decoded.slice(colon + 1);
        if (user === "admin" && pass === env.ADMIN_PASSWORD) {
          return next();
        }
      }
    } catch {}
  }

  return new Response("Login required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' }
  });
}