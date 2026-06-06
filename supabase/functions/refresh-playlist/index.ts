// Auto-fetch new IPTV trial credentials from external panel when in maintenance.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PANEL_URL = "https://server-synth-ai.lovable.app/api/public/s/ge238wa17n";

// Simple per-instance throttle so we don't hammer the upstream panel.
let lastRunAt = 0;
const MIN_INTERVAL_MS = 30_000;

function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function deriveHost(m3uUrl: string): string {
  try {
    const u = new URL(m3uUrl);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    return `${u.protocol}//${u.hostname}:${port}`;
  } catch {
    return "http://cdnflash.top:80";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const now = Date.now();
    if (now - lastRunAt < MIN_INTERVAL_MS) {
      return new Response(JSON.stringify({ ok: false, throttled: true }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    lastRunAt = now;

    const email = Deno.env.get("PLAYLIST_PANEL_EMAIL");
    const password = Deno.env.get("PLAYLIST_PANEL_PASSWORD");
    const serverId = Deno.env.get("PLAYLIST_PANEL_SERVER_ID");
    const packageId = Deno.env.get("PLAYLIST_PANEL_PACKAGE_ID");

    if (!email || !password || !serverId || !packageId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing panel secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Need to validate user is authenticated to trigger this.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Login (keeps a session cookie that we don't actually need; the create call
    //    re-authenticates server-side via the same endpoint pattern).
    const loginRes = await fetch(PANEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "Login",
        captcha: "not-a-robot",
        captchaChecked: true,
        username: email,
        password,
        twofactor_code: "",
        twofactor_recovery_code: "",
        twofactor_trusted_device_id: "",
      }),
    });
    const loginText = await loginRes.text();
    if (!loginRes.ok) {
      console.error("Panel login failed", loginRes.status, loginText);
      return new Response(JSON.stringify({ ok: false, error: "Panel login failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Forward any cookies from login (some panels require it)
    const cookie = loginRes.headers.get("set-cookie") ?? "";

    // 2) Create trial client with random credentials
    const newUser = randDigits(9);
    const newPass = randDigits(9);

    const createRes = await fetch(PANEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        action: "criar_cliente",
        server_id: serverId,
        package_id: packageId,
        trial_hours: 6,
        connections: 1,
        bouquets: "",
        parent_can_edit_personal_data: "YES",
        username: newUser,
        password: newPass,
      }),
    });
    const createJson = await createRes.json().catch(() => null);
    if (!createRes.ok || !createJson?.data) {
      console.error("Panel create failed", createRes.status, JSON.stringify(createJson));
      return new Response(
        JSON.stringify({ ok: false, error: "Panel create failed", details: createJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const d = createJson.data;
    const username: string = d.username ?? newUser;
    const credPassword: string = d.password ?? newPass;
    const m3u: string = d.m3u_url ?? "";
    const host = deriveHost(m3u);
    const expiresAt: string | null = d.expires_at ?? null;

    // 3) Persist with service role; deactivate previous, insert new
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await service.from("iptv_credentials").update({ is_active: false }).eq("is_active", true);

    const { data: inserted, error: insertErr } = await service
      .from("iptv_credentials")
      .insert({
        username,
        password: credPassword,
        host,
        expires_at: expiresAt,
        is_active: true,
        bot_source: "auto_panel",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert failed", insertErr);
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, credentials: { host, username, expires_at: expiresAt }, id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("refresh-playlist error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
