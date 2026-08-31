import { supabase, type Cat, type GlobalStats } from "./supabase";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-cat-happy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchStats(): Promise<GlobalStats | null> {
  const { data, error } = await supabase
    .from("global_stats")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch stats:", error);
    return null;
  }
  return data;
}

export async function fetchCatsInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  limit: number = 500
): Promise<Cat[]> {
  // Random offset so different cats appear each time the map loads
  const rowOffset = Math.floor(Math.random() * 500);

  const { data, error } = await supabase.rpc("get_random_cats", {
    south,
    west,
    north,
    east,
    cat_limit: limit,
    row_offset: rowOffset,
  });

  if (error) {
    console.error("Failed to fetch cats:", error);
    return [];
  }

  // Shuffle results client-side so different cats appear each load
  const cats = (data ?? []) as Cat[];
  for (let i = cats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }
  return cats;
}

export async function fetchCatById(id: number): Promise<Cat | null> {
  const { data, error } = await supabase
    .from("cats")
    .select("id, lat, lng, mood, name, made_happy_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Failed to fetch cat:", error);
    return null;
  }
  return data;
}

export async function makeCatHappyViaStripe(catId: number): Promise<string | null> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ catId, action: "create-checkout" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    console.error("Stripe checkout error:", err);
    return null;
  }

  const data = await res.json();
  return data.url ?? null;
}

export async function makeCatHappyDirect(
  catId: number,
  name?: string
): Promise<boolean> {
  // Prefer edge function when available
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        catId,
        action: "make-happy",
        name: name?.trim() || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success === true) return true;
    }
  } catch {
    // fall through to direct client update
  }

  // Fallback: update directly via Supabase client (RLS allows it)
  const { data, error } = await supabase
    .from("cats")
    .update({
      mood: "happy",
      made_happy_at: new Date().toISOString(),
      name: name?.trim() || null,
    })
    .eq("id", catId)
    .eq("mood", "angry")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Direct make-happy failed:", error);
    return false;
  }
  return true;
}
