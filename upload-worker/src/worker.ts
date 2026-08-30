export interface Env {
  MEDIA_BUCKET: R2Bucket;
  ADMIN_SESSION_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve files via GET /media/uploads/...
    if (request.method === "GET" && url.pathname.startsWith("/media/")) {
      const key = url.pathname.slice("/media/".length);
      const object = await env.MEDIA_BUCKET.get(key);
      
      if (!object) {
        return new Response("Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(object.body, {
        headers,
      });
    }

    // Only handle POST /api/r2-upload/upload
    if (request.method !== "POST" || url.pathname !== "/api/r2-upload/upload") {
      return new Response("Not Found", { status: 404 });
    }

    // 1. Authenticate using the shared secret
    const authHeader = request.headers.get("X-Admin-Secret");
    if (!authHeader || authHeader !== env.ADMIN_SESSION_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Extract key and content type
    const key = url.searchParams.get("key");
    const contentType = request.headers.get("Content-Type") ?? "application/octet-stream";

    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // 3. Upload directly to R2 bucket using streaming body
      await env.MEDIA_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      return new Response(JSON.stringify({ ok: true, key }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Upload failed";
      return new Response(JSON.stringify({ error: errMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
};
