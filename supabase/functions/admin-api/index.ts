import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Rate limiting: max requests per window
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MINUTES = 5;

async function checkRateLimit(supabase: any, identifier: string, action: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("attempt_at", windowStart);

  if ((count || 0) >= RATE_LIMIT_MAX) {
    return false; // rate limited
  }

  // Record this attempt
  await supabase.from("rate_limits").insert({ identifier, action });
  return true;
}

async function requireAdmin(supabase: any, req: Request): Promise<{ user: any; error?: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  // Check admin emails
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "admin_emails").maybeSingle();
  const adminEmails: string[] = setting?.value ? (Array.isArray(setting.value) ? setting.value : []) : [];
  
  if (!user.email || !adminEmails.includes(user.email)) {
    return { user: null, error: new Response(JSON.stringify({ error: "Forbidden: not an admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  return { user };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action || action.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- CHECK ADMIN (no admin required) ---
    if (action === "check_admin") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ is_admin: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (!user) {
        return new Response(JSON.stringify({ is_admin: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Rate limit check_admin calls
      const allowed = await checkRateLimit(supabase, user.id, "check_admin");
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "admin_emails").maybeSingle();
      const adminEmails: string[] = setting?.value ? (Array.isArray(setting.value) ? setting.value : []) : [];
      const isAdmin = user.email ? adminEmails.includes(user.email) : false;
      
      return new Response(JSON.stringify({ is_admin: isAdmin }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- GET SETTINGS (authenticated only) ---
    if (action === "get_settings") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- GENERATE INSTALL TOKEN (authenticated only) ---
    if (action === "generate_install_token") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const allowed = await checkRateLimit(supabase, user.id, "generate_token");
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: tokenData, error } = await supabase.from("install_tokens").insert({ created_by: user.id }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ token: tokenData.token, expires_at: tokenData.expires_at }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== ALL ACTIONS BELOW REQUIRE ADMIN =====
    const { user: adminUser, error: authError } = await requireAdmin(supabase, req);
    if (authError) return authError;

    // Rate limit admin actions
    const allowed = await checkRateLimit(supabase, adminUser.id, `admin_${action}`);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- LIST USERS ---
    if (action === "list_users") {
      const { data, error } = await supabase.from("app_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- BAN USER ---
    if (action === "ban_user") {
      const { user_id, reason } = await req.json();
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const sanitizedReason = typeof reason === "string" ? reason.slice(0, 500) : "Banido pelo admin";
      const { error } = await supabase.from("app_users").update({ is_banned: true, ban_reason: sanitizedReason }).eq("user_id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UNBAN USER ---
    if (action === "unban_user") {
      const { user_id } = await req.json();
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabase.from("app_users").update({ is_banned: false, ban_reason: null }).eq("user_id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- SET ACCOUNT EXPIRATION ---
    if (action === "set_expiration") {
      const { user_id, expires_at, is_permanent } = await req.json();
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const update: Record<string, unknown> = {};
      if (is_permanent) {
        update.is_permanent = true;
        update.account_expires_at = null;
      } else {
        update.is_permanent = false;
        update.account_expires_at = expires_at;
      }
      const { error } = await supabase.from("app_users").update(update).eq("user_id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- DELETE USER ---
    if (action === "delete_user") {
      const { user_id } = await req.json();
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- FORCE LOGOUT ---
    if (action === "logout_user") {
      const { user_id } = await req.json();
      if (!user_id || typeof user_id !== "string") {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabase.auth.admin.signOut(user_id, "global");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- TOGGLE MAINTENANCE ---
    if (action === "set_maintenance") {
      const { enabled, message } = await req.json();
      const sanitizedMsg = typeof message === "string" ? message.slice(0, 200) : "Em manutenção";
      const { error } = await supabase.from("app_settings").update({
        value: { enabled: !!enabled, message: sanitizedMsg },
        updated_at: new Date().toISOString(),
      }).eq("key", "maintenance_mode");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UPDATE HOST ---
    if (action === "update_host") {
      const { host } = await req.json();
      if (!host || typeof host !== "string" || host.length > 500) {
        return new Response(JSON.stringify({ error: "Invalid host" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Validate URL format
      try {
        new URL(host);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid URL format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await supabase.from("app_settings").update({
        value: JSON.stringify(host),
        updated_at: new Date().toISOString(),
      }).eq("key", "default_host");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UPDATE BLOCKED CONTENT/CATEGORIES ---
    if (action === "update_blocked") {
      const { key, value } = await req.json();
      if (!key || !["blocked_content", "blocked_categories"].includes(key)) {
        return new Response(JSON.stringify({ error: "Invalid key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!Array.isArray(value)) {
        return new Response(JSON.stringify({ error: "Value must be an array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({ key, value, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Don't leak internal error details
    console.error("Admin API error:", msg);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
