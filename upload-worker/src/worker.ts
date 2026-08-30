export interface Env {
  MEDIA_BUCKET: R2Bucket;
  ADMIN_SESSION_SECRET: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret, Content-Length",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve files via GET /media/uploads/... with Range streaming & CDN caching
    if (request.method === "GET" && url.pathname.startsWith("/media/")) {
      const key = url.pathname.slice("/media/".length);
      const rangeHeader = request.headers.get("range");

      const options: R2GetOptions = {};
      if (rangeHeader) {
        options.range = request.headers;
      }

      const object = await env.MEDIA_BUCKET.get(key, options);
      
      if (!object) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Accept-Ranges", "bytes");

      if (object.range) {
        const r = object.range as { offset?: number; length?: number };
        if (r.offset !== undefined && r.length !== undefined) {
          headers.set("Content-Range", `bytes ${r.offset}-${r.offset + r.length - 1}/${object.size}`);
          headers.set("Content-Length", String(r.length));
        }
      } else {
        headers.set("Content-Length", String(object.size));
      }

      const status = rangeHeader && object.range ? 206 : 200;

      return new Response(object.body, {
        status,
        headers,
      });
    }

    // Only handle POST /api/r2-upload/upload
    if (request.method !== "POST" || url.pathname !== "/api/r2-upload/upload") {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    // 1. Authenticate using the shared secret
    const authHeader = request.headers.get("X-Admin-Secret");
    if (!authHeader || authHeader !== env.ADMIN_SESSION_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 2. Extract key and content type
    const key = url.searchParams.get("key");
    const contentType = request.headers.get("Content-Type") ?? "application/octet-stream";

    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key" }), { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    const contentLength = request.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large" }), { status: 413, headers: { ...corsHeaders } });
    }

    try {
      // 3. Upload directly to R2 bucket using streaming body
      await env.MEDIA_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Upload failed";
      return new Response(JSON.stringify({ error: errMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
};
