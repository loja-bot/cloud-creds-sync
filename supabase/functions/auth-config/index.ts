import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({ turnstileSiteKey: Deno.env.get('TURNSTILE_SITE_KEY') ?? '' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
