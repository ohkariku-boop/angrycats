import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { catId, action } = body;

    if (action === "create-checkout") {
      if (!STRIPE_SECRET_KEY) {
        return new Response(
          JSON.stringify({ error: "Stripe not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          mode: "payment",
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": "50",
          "line_items[0][price_data][product_data][name]": "Adopt & Make a Cat Happy",
          "line_items[0][quantity]": "1",
          "metadata[cat_id]": String(catId ?? ""),
          success_url: `${APP_URL}/?happy=${catId}`,
          cancel_url: `${APP_URL}/`,
        }).toString(),
      });

      if (!stripeRes.ok) {
        const err = await stripeRes.text();
        return new Response(
          JSON.stringify({ error: "Stripe error", details: err }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = await stripeRes.json();
      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stripe-webhook") {
      const sig = req.headers.get("stripe-signature") ?? "";
      const rawBody = await req.text();

      const event = await stripeConstructEvent(rawBody, sig);
      if (!event) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as { metadata?: { cat_id?: string } };
        const catId = session.metadata?.cat_id;
        if (catId) {
          await supabase
            .from("cats")
            .update({ mood: "happy", made_happy_at: new Date().toISOString() })
            .eq("id", parseInt(catId, 10))
            .eq("mood", "angry");
        }
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "make-happy") {
      // Direct make-happy (fallback if Stripe not configured, for demo)
      if (!catId) {
        return new Response(
          JSON.stringify({ error: "catId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const catName = typeof body.name === "string" ? body.name.trim().slice(0, 40) : null;

      const { data, error } = await supabase
        .from("cats")
        .update({
          mood: "happy",
          made_happy_at: new Date().toISOString(),
          name: catName || null,
        })
        .eq("id", catId)
        .eq("mood", "angry")
        .select("id, mood, name")
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ error: "Cat not found or already happy" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, cat: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function stripeConstructEvent(rawBody: string, sig: string): Promise<any | null> {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!webhookSecret || !sig) return null;

  try {
    const parts = sig.split(",");
    const sigMap: Record<string, string> = {};
    for (const part of parts) {
      const [k, v] = part.split("=");
      sigMap[k.trim()] = v.trim();
    }

    const timestamp = sigMap["t"];
    const signature = sigMap["v1"];
    if (!timestamp || !signature) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedPayload = `${timestamp}.${rawBody}`;
    const sigBytes = hexToBytes(signature);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(signedPayload)
    );

    if (!valid) return null;

    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
