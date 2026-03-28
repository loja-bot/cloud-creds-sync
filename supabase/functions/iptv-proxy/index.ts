import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const streamUrl = url.searchParams.get("streamUrl");

    if (streamUrl) {
      // Stream proxy mode - forward Range headers for seeking support
      const fetchHeaders: Record<string, string> = {
        "User-Agent": "SmartTV-IPTV-App/1.0",
        Accept: "*/*",
      };

      // Forward Range header from client for seek support
      const rangeHeader = req.headers.get("Range");
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      const proxyRes = await fetch(streamUrl, { headers: fetchHeaders });

      const headers = new Headers(corsHeaders);
      // Forward essential headers for seeking
      const ct = proxyRes.headers.get("content-type");
      if (ct) headers.set("Content-Type", ct);
      const cl = proxyRes.headers.get("content-length");
      if (cl) headers.set("Content-Length", cl);
      const cr = proxyRes.headers.get("content-range");
      if (cr) headers.set("Content-Range", cr);
      const ar = proxyRes.headers.get("accept-ranges");
      if (ar) headers.set("Accept-Ranges", ar);
      // Always signal we accept ranges
      if (!ar) headers.set("Accept-Ranges", "bytes");

      return new Response(proxyRes.body, {
        status: proxyRes.status, // Will be 206 for partial content
        headers,
      });
    }

    // JSON API proxy mode
    let targetUrl: string | null = null;
    if (req.method === "POST") {
      const body = await req.json();
      targetUrl = body.url;
    } else {
      targetUrl = url.searchParams.get("url");
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Proxying API request to: ${targetUrl}`);

    const proxyRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "SmartTV-IPTV-App/1.0",
        Accept: "application/json, */*",
      },
    });

    const contentType = proxyRes.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await proxyRes.json();
    } else {
      const text = await proxyRes.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
