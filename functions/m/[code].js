export async function onRequestGet({ env, params }) {
  const { code } = params;

  // Validate input: ensure code is a non-empty string
  if (!code || typeof code !== 'string' || code.length === 0) {
    return serve404('Invalid short code.');
  }

  try {
    // Fetch the raw value from KV
    const raw = await env.SHORT_LINKS.get(code);
    if (raw === null) {
      return serve404('This link does not exist or has expired.');
    }

    // Attempt to parse as JSON; if it fails, treat raw as the URL
    let targetUrl = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.url === 'string') {
        targetUrl = parsed.url;
      }
    } catch {
      // Not JSON, use raw as-is
    }

    // Validate the target URL (must start with http:// or https://)
    if (!isValidUrl(targetUrl)) {
      console.warn(`Invalid URL for code "${code}": ${targetUrl}`);
      return serve404('The destination URL is malformed.');
    }

    // Redirect (302 Found – temporary redirect)
    return Response.redirect(targetUrl, 302);
  } catch (error) {
    // Catch unexpected errors (e.g., KV read failure)
    console.error(`Error processing code "${code}":`, error);
    return serve404('Something went wrong. Please try again later.');
  }
}

/**
 * Returns a 404 HTML response with the provided message and the GIF.
 */
function serve404(message = 'Link not found.') {
  const gifUrl = 'https://marya-hosting.pages.dev/btfstorage/server/bcec1d3c63984054a20536e4dcac15fa.gif';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 - Link Not Found</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0d0d0d;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #fff;
      text-align: center;
      padding: 1rem;
    }
    .container {
      max-width: 600px;
      background: #1a1a1a;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      border: 1px solid #333;
    }
    .gif-wrapper {
      margin: 0 auto 1.5rem;
      max-width: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .gif-wrapper img {
      display: block;
      width: 100%;
      height: auto;
    }
    h1 {
      font-size: 2.5rem;
      margin: 0.5rem 0 0.25rem;
      color: #ff6b6b;
      letter-spacing: 1px;
    }
    p {
      font-size: 1.1rem;
      margin: 0.25rem 0 1rem;
      color: #ccc;
    }
    .sub {
      font-size: 0.9rem;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="gif-wrapper">
      <img src="${gifUrl}" alt="404 Error" />
    </div>
    <h1>404</h1>
    <p>${message}</p>
    <p class="sub">The short link you're looking for couldn't be found.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * Basic URL validator – ensures the URL uses http or https.
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}