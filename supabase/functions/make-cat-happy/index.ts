import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const APP_URL =
  Deno.env.get("APP_URL") ?? "https://ohkariku-boop.github.io/angrycats";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const stripeSig = req.headers.get("stripe-signature");
  if (stripeSig) {
    return handleStripeWebhook(req, stripeSig);
  }

  try {
    const body = await req.json();
    const { catId, action, name, sessionId } = body;

    if (action === "create-checkout") {
      if (!STRIPE_SECRET_KEY) {
        return json({ error: "Stripe not configured" }, 503);
      }
      if (!catId) return json({ error: "catId required" }, 400);

      const catName =
        typeof name === "string" ? name.trim().slice(0, 40) : "";

      const params = new URLSearchParams();
      params.set("mode", "payment");
      // Include session_id so client can confirm payment if webhook lags/fails
      params.set(
        "success_url",
        `${APP_URL}/?happy=${catId}&session_id={CHECKOUT_SESSION_ID}`
      );
      params.set("cancel_url", `${APP_URL}/?cancelled=1`);
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][unit_amount]", "50");
      params.set(
        "line_items[0][price_data][product_data][name]",
        catName ? `Bribe cat: ${catName}` : `Bribe angry cat #${catId}`
      );
      params.set("line_items[0][quantity]", "1");
      params.set("metadata[cat_id]", String(catId));
      if (catName) params.set("metadata[cat_name]", catName);

      const stripeRes = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      if (!stripeRes.ok) {
        const err = await stripeRes.text();
        console.error("Stripe error", err);
        return json({ error: "Stripe error", details: err }, 502);
      }

      const session = await stripeRes.json();
      return json({ url: session.url });
    }

    // Client returns from Checkout — verify with Stripe and mark happy
    if (action === "confirm-session") {
      if (!STRIPE_SECRET_KEY) {
        return json({ error: "Stripe not configured" }, 503);
      }
      if (!sessionId || typeof sessionId !== "string") {
        return json({ error: "sessionId required" }, 400);
      }

      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        }
      );
      if (!stripeRes.ok) {
        const err = await stripeRes.text();
        return json({ error: "Could not load session", details: err }, 502);
      }

      const session = await stripeRes.json();
      if (session.payment_status !== "paid") {
        return json({
          success: false,
          error: "not_paid",
          payment_status: session.payment_status,
        });
      }

      const paidCatId = session.metadata?.cat_id;
      const paidName = session.metadata?.cat_name?.trim().slice(0, 40) || null;
      if (!paidCatId) {
        return json({ success: false, error: "no_cat_in_metadata" }, 400);
      }

      const result = await markCatHappy(paidCatId, paidName);
      return json({
        success: true,
        catId: parseInt(paidCatId, 10),
        name: paidName,
        ...result,
      });
    }

    if (action === "make-happy") {
      if (!catId) return json({ error: "catId required" }, 400);
      const catName =
        typeof name === "string" ? name.trim().slice(0, 40) : null;
      const result = await markCatHappy(String(catId), catName);
      if (!result.ok) {
        return json({ error: result.reason }, result.reason === "not_found" ? 404 : 500);
      }
      return json({ success: true, already_happy: result.already_happy, id: result.id });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

async function markCatHappy(
  catId: string,
  catName: string | null
): Promise<{ ok: boolean; already_happy?: boolean; id?: number; reason?: string }> {
  const id = parseInt(catId, 10);
  if (Number.isNaN(id)) return { ok: false, reason: "invalid_id" };

  const update: Record<string, unknown> = {
    mood: "happy",
    made_happy_at: new Date().toISOString(),
  };
  if (catName) update.name = catName;

  const { data, error } = await supabase
    .from("cats")
    .update(update)
    .eq("id", id)
    .eq("mood", "angry")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("markCatHappy error", error);
    return { ok: false, reason: error.message };
  }

  if (data) return { ok: true, id: data.id, already_happy: false };

  // Already happy is still success
  const { data: existing } = await supabase
    .from("cats")
    .select("id, mood")
    .eq("id", id)
    .maybeSingle();

  if (existing?.mood === "happy") {
    return { ok: true, id, already_happy: true };
  }
  return { ok: false, reason: "not_found" };
}

async function handleStripeWebhook(
  req: Request,
  sig: string
): Promise<Response> {
  const rawBody = await req.text();

  if (!STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Webhook secret not configured" }, 500);
  }

  const valid = await verifyStripeSignature(
    rawBody,
    sig,
    STRIPE_WEBHOOK_SECRET
  );
  if (!valid) {
    return json({ error: "Invalid signature" }, 400);
  }

  let event: {
    type?: string;
    data?: {
      object?: {
        metadata?: { cat_id?: string; cat_name?: string };
        payment_status?: string;
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const catId = session?.metadata?.cat_id;
    const catName = session?.metadata?.cat_name?.trim().slice(0, 40) || null;
    if (catId) {
      await markCatHappy(catId, catName);
    }
  }

  return json({ received: true });
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = header.split(",");
    const map: Record<string, string> = {};
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k && v) map[k.trim()] = v.trim();
    }
    const timestamp = map["t"];
    const signature = map["v1"];
    if (!timestamp || !signature) return false;

    const ts = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${timestamp}.${payload}`)
    );
    const expected = hexFromBuffer(signed);
    return timingSafeEqual(expected, signature);
  } catch {
    return false;
  }
}

function hexFromBuffer(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
