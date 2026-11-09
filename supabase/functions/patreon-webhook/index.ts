import { createHmac } from "node:crypto";
import {
  json,
  preflight,
  requiredEnv,
  safeMessage,
} from "../_shared/http.ts";
import {
  membershipFromWebhook,
  type JsonApiResource,
} from "../_shared/patreon.ts";
import { adminClient } from "../_shared/supabase.ts";

interface PatreonWebhookPayload {
  data?: JsonApiResource;
  included?: JsonApiResource[];
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = requiredEnv("PATREON_WEBHOOK_SECRET");
  const expected = createHmac("md5", secret).update(rawBody).digest("hex");
  const supplied = signature.trim().toLowerCase().replace(/^md5=/, "");
  if (supplied.length !== expected.length) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(supplied);
  const b = encoder.encode(expected);
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a[index] ^ b[index];
  }
  return mismatch === 0;
}

async function findProfileId(
  admin: ReturnType<typeof adminClient>,
  values: { userId: string | null; memberId: string | null; email: string | null },
): Promise<string | null> {
  if (values.userId) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("patreon_user_id", values.userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  if (values.memberId) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("patreon_member_id", values.memberId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  if (values.email) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", values.email)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  return null;
}

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const signature = request.headers.get("x-patreon-signature");
  if (!signature) {
    return json({ error: "Missing Patreon signature." }, 401);
  }

  const rawBody = await request.text();
  let valid = false;
  try {
    valid = verifySignature(rawBody, signature);
  } catch (error) {
    console.error("Webhook verification error:", safeMessage(error));
    return json({ error: "Webhook is not configured." }, 500);
  }
  if (!valid) {
    return json({ error: "Invalid signature." }, 401);
  }

  let payload: PatreonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PatreonWebhookPayload;
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const event = request.headers.get("x-patreon-event") || "";
  const membership = membershipFromWebhook(payload.data, event, payload.included);
  if (!membership) {
    return json({ ok: true, ignored: true });
  }

  try {
    const admin = adminClient();
    const profileId = await findProfileId(admin, membership);
    if (!profileId) {
      // The user has not completed the Patreon OAuth login yet. Their next
      // login will fetch fresh membership data directly from Patreon.
      console.info("Patreon webhook for an unknown profile:", {
        userId: membership.userId,
        memberId: membership.memberId,
        event,
      });
      return json({ ok: true, updated: false, reason: "profile_not_found" });
    }

    const update: Record<string, unknown> = {
      membership_status: membership.active ? "active" : "inactive",
      entitled_tier_ids: membership.tierIds,
      pledge_amount_cents: membership.amountCents,
      patreon_campaign_id: membership.campaignId,
      last_synced_at: new Date().toISOString(),
    };

    if (membership.userId) update.patreon_user_id = membership.userId;
    if (membership.memberId) update.patreon_member_id = membership.memberId;
    if (membership.email) update.email = membership.email;
    if (membership.fullName) update.full_name = membership.fullName;

    const { data: previous } = await admin
      .from("profiles")
      .select("membership_status, entitled_tier_ids")
      .eq("id", profileId)
      .maybeSingle();

    const { error } = await admin.from("profiles").update(update).eq("id", profileId);
    if (error) throw error;

    // Append an audit row when the verified tier or status actually changed.
    // The table is optional; a missing table must never block membership sync.
    try {
      const nextStatus = membership.active ? "active" : "inactive";
      const previousTiers = Array.isArray(previous?.entitled_tier_ids)
        ? (previous?.entitled_tier_ids as string[])
        : [];
      const previousStatus = (previous?.membership_status as string | undefined) ?? null;
      const tierChanged =
        previousTiers.slice().sort().join(",") !== membership.tierIds.slice().sort().join(",");
      if (previousStatus !== nextStatus || tierChanged) {
        await admin.from("membership_events").insert({
          profile_id: profileId,
          event_type: event || "members:update",
          from_status: previousStatus,
          to_status: nextStatus,
          from_tier: previousTiers.join(",") || null,
          to_tier: membership.tierIds.join(",") || null,
          source: "patreon",
        });
      }
    } catch (auditError) {
      console.warn("Could not record membership event:", safeMessage(auditError));
    }

    return json({ ok: true, updated: true, active: membership.active });
  } catch (error) {
    console.error("Patreon webhook failed:", safeMessage(error));
    return json({ error: "Could not process the webhook." }, 500);
  }
});
