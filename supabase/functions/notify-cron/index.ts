// ARISE — notify-cron
//
// Runs every 15 minutes via pg_cron. Decides, per profile, which time-based
// notifications are due and sends them via send-push. All times come from
// notification_preferences (per-profile, configurable — never hardcoded here),
// all game state from notification_state (client-mirrored) + gate tables.
//
// Handles: T1 (session today), T4 (DIS at risk), K1/K2 (nutrition),
//          L3 (unspent skill point), B3/B4 (active gate + planned session).
// Event-based notifications (B1, B2) are DB triggers; T2/T3/L1/L2 are
// client-side hooks. This function knows nothing about those.
//
// Dedup: notification_log (profile_id, notif_key, sent_on) — a key fires at
// most once per local day. "Due" means local time >= preferred time, so a
// missed cron run self-heals on the next tick.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const GATE_LABELS: Record<string, string> = {
  normal: "Normal Gate",
  high: "High-Rank Gate",
  red: "Red Gate",
};

function localParts(tz: string): { date: string; time: string; isoDow: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  const dowMap: Record<string, number> = { mån: 1, tis: 2, ons: 3, tors: 4, fre: 5, lör: 6, sön: 7 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    isoDow: dowMap[parts.weekday.replace(".", "").toLowerCase()] ?? 1,
  };
}

// time columns come back as "HH:MM:SS" — compare on "HH:MM"
function due(nowHHMM: string, prefTime: string): boolean {
  return nowHHMM >= prefTime.slice(0, 5);
}

async function trySend(
  profileId: string, key: string, localDate: string,
  title: string, body: string, tag: string,
): Promise<boolean> {
  // Claim the (profile, key, day) slot first — on conflict someone already sent it.
  const { error } = await supabase.from("notification_log").insert({
    profile_id: profileId, notif_key: key, sent_on: localDate,
  });
  if (error) return false; // unique violation -> already sent today

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ profile_id: profileId, title, body, tag }),
  });
  if (!res.ok) console.error(`send-push ${key} for ${profileId} failed:`, res.status, await res.text());
  return true;
}

Deno.serve(async (_req) => {
  try {
    // Only profiles that can actually receive anything
    const { data: subs } = await supabase.from("push_subscriptions").select("profile_id");
    const subscribed = new Set((subs ?? []).map((s) => s.profile_id));
    if (subscribed.size === 0) {
      return new Response(JSON.stringify({ checked: 0, sent: [] }), { status: 200 });
    }

    const { data: prefs } = await supabase.from("notification_preferences").select("*");
    const { data: states } = await supabase.from("notification_state").select("*");
    const stateBy = new Map((states ?? []).map((s) => [s.profile_id, s]));

    // Active gates per profile (for B3/B4)
    const { data: activeGates } = await supabase
      .from("gate_instances")
      .select("id, gate_type, boss_name, party_size, team_id, team_members(profile_id)")
      .eq("status", "active");

    const gateBy = new Map<string, { type: string; boss: string; solo: boolean }>();
    for (const g of activeGates ?? []) {
      for (const m of (g.team_members as { profile_id: string }[] | null) ?? []) {
        gateBy.set(m.profile_id, {
          type: g.gate_type,
          boss: g.boss_name ?? "Gate Boss",
          solo: (g.party_size ?? 1) <= 1,
        });
      }
    }

    const sent: string[] = [];

    for (const p of prefs ?? []) {
      if (!p.enabled || !subscribed.has(p.profile_id)) continue;
      const muted = new Set<string>(p.disabled_keys ?? []);
      const { date, time, isoDow } = localParts(p.tz || "Europe/Stockholm");
      const st = stateBy.get(p.profile_id);

      const todayFresh = st?.today_date === date;
      const schedule: string[] = Array.isArray(st?.schedule) ? st.schedule : [];
      const gymToday = schedule[isoDow - 1] === "gym";
      const gymLogged = todayFresh && !!st?.today_gym_logged;

      // T1 — session planned today, not yet logged
      if (!muted.has("t1") && due(time, p.t1_time) && st && gymToday && !gymLogged) {
        if (await trySend(p.profile_id, "t1", date,
          "ARISE", "You have a training session today", "t1")) sent.push(`t1:${p.profile_id}`);
      }

      // K1 — midday macro reminder (pure time-based)
      if (!muted.has("k1") && due(time, p.k1_time)) {
        if (await trySend(p.profile_id, "k1", date,
          "ARISE", "Don't forget your macro goals today!", "k1")) sent.push(`k1:${p.profile_id}`);
      }

      // K2 — end of day, skip if all 3 check-ins already done
      if (!muted.has("k2") && due(time, p.k2_time) && !(todayFresh && st?.today_nutrition_done)) {
        if (await trySend(p.profile_id, "k2", date,
          "ARISE", "Log your nutritional goals for the day!", "k2")) sent.push(`k2:${p.profile_id}`);
      }

      // L3 — unspent skill point for 3+ days
      if (!muted.has("l3") && due(time, p.l3_time) && st && (st.skill_points ?? 0) > 0) {
        const earned = st.last_skill_point_at ? new Date(st.last_skill_point_at).getTime() : 0;
        if (earned > 0 && Date.now() - earned > 3 * 86400_000) {
          if (await trySend(p.profile_id, "l3", date,
            "ARISE", "You still have a skill point to assign.", "l3")) sent.push(`l3:${p.profile_id}`);
        }
      }

      // T4 — DIS at risk: configured weekday, behind pace
      if (!muted.has("t4") && isoDow === p.t4_dow && due(time, p.t4_time) && st) {
        const scheduled = (st.days_per_week ?? 0) + 1; // gym days + 1 cardio (same rule as simulateWeekEnd)
        const done = (st.weekly_gym ?? 0) + Math.min(st.weekly_cardio ?? 0, 1);
        const paceTarget = Math.ceil(scheduled * (isoDow / 7));
        if (scheduled > 1 && done < paceTarget) {
          if (await trySend(p.profile_id, "t4", date,
            "ARISE", "3 days left this week and you're behind pace — log a session to secure your crit bonus.", "t4"))
            sent.push(`t4:${p.profile_id}`);
        }
      }

      // B3/B4 — morning: active gate + session planned today + not logged
      const gate = gateBy.get(p.profile_id);
      if (gate && due(time, p.b34_time) && st && gymToday && !gymLogged) {
        const key = gate.solo ? "b3" : "b4";
        if (!muted.has(key)) {
          const label = GATE_LABELS[gate.type] ?? "Gate";
          const body = gate.solo
            ? `You're in a ${label}, deal your damage by completing your training session today!`
            : `You're in a ${label}, contribute by completing your training session today!`;
          if (await trySend(p.profile_id, key, date, "ARISE", body, "b34")) sent.push(`${key}:${p.profile_id}`);
        }
      }
    }

    // Housekeeping: drop dedup rows older than 30 days
    await supabase.from("notification_log").delete()
      .lt("sent_on", new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));

    return new Response(JSON.stringify({ checked: prefs?.length ?? 0, sent }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
