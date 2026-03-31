import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

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

    // --- LIST USERS ---
    if (action === "list_users") {
      const { data, error } = await supabase.from("app_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- BAN USER ---
    if (action === "ban_user") {
      const { user_id, reason } = await req.json();
      const { error } = await supabase.from("app_users").update({ is_banned: true, ban_reason: reason || "Banido pelo admin" }).eq("user_id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UNBAN USER ---
    if (action === "unban_user") {
      const { user_id } = await req.json();
      const { error } = await supabase.from("app_users").update({ is_banned: false, ban_reason: null }).eq("user_id", user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- SET ACCOUNT EXPIRATION ---
    if (action === "set_expiration") {
      const { user_id, expires_at, is_permanent } = await req.json();
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
      // Delete from auth (cascade will remove app_users row)
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- FORCE LOGOUT ---
    if (action === "logout_user") {
      const { user_id } = await req.json();
      const { error } = await supabase.auth.admin.signOut(user_id, "global");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- TOGGLE MAINTENANCE ---
    if (action === "set_maintenance") {
      const { enabled, message } = await req.json();
      const { error } = await supabase.from("app_settings").update({
        value: { enabled: !!enabled, message: message || "Em manutenção" },
        updated_at: new Date().toISOString(),
      }).eq("key", "maintenance_mode");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- GET SETTINGS ---
    if (action === "get_settings") {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- CHECK ADMIN ---
    if (action === "check_admin") {
      // Get the caller's JWT to identify who is calling
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ is_admin: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Check admin_emails setting
      const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "admin_emails").maybeSingle();
      const adminEmails: string[] = setting?.value ? (Array.isArray(setting.value) ? setting.value : []) : [];
      
      // Get user from token
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      const isAdmin = user?.email ? adminEmails.includes(user.email) : false;
      
      return new Response(JSON.stringify({ is_admin: isAdmin }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UPDATE HOST ---
    if (action === "update_host") {
      const { host } = await req.json();
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

    // --- GENERATE INSTALL TOKEN ---
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
      const { data: tokenData, error } = await supabase.from("install_tokens").insert({ created_by: user.id }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ token: tokenData.token, expires_at: tokenData.expires_at }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
