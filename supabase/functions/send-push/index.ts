// ARISE — send-push
//
// Generic push-send function. Knows nothing about game logic — it just delivers
// whatever it's told to. All "should we send X now?" decisions belong to the
// callers (Brief B triggers, the cron stub, or manual/demo invocations).
//
// Request body: { profile_id: string, title: string, body: string, tag?: string, data?: object, action?: 'show' | 'close' }
//
// Env vars required (set as Edge Function secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. "mailto:you@example.com")
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the Supabase runtime.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:example@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { profile_id, title, body, tag, data, action } = await req.json();

    if (!profile_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "profile_id, title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: subs, error: fetchError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("profile_id", profile_id);

    if (fetchError) throw fetchError;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: "No subscriptions for this profile" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({ title, body, tag, data, action });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        };
        try {
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch (err) {
          failed++;
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription is gone (uninstalled/blocked) — clean it up.
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("push send failed", sub.id, statusCode, err?.body || err);
          }
        }
      }),
    );

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
