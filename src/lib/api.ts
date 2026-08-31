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

async function rpcCats(
  south: number,
  west: number,
  north: number,
  east: number,
  limit: number,
  rowOffset: number
): Promise<Cat[]> {
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
  return (data ?? []) as Cat[];
}

export async function fetchCatsInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  limit: number = 500
): Promise<Cat[]> {
  const rowOffset = Math.floor(Math.random() * 200);
  const span = east > west ? east - west : 360 - (west - east);

  // World / large view: fetch several longitude bands in parallel for even scatter
  if (span > 120) {
    const bands = 8;
    const perBand = Math.ceil(limit / bands);
    const bandWidth = span / bands;
    const startWest = east > west ? west : west; // normalized caller

    const promises: Promise<Cat[]>[] = [];
    for (let i = 0; i < bands; i++) {
      let bWest = startWest + i * bandWidth;
      let bEast = startWest + (i + 1) * bandWidth;
      // clamp into [-180, 180]
      if (bWest > 180) bWest -= 360;
      if (bEast > 180) bEast -= 360;
      if (bWest < -180) bWest += 360;
      if (bEast < -180) bEast += 360;
      // if band crosses antimeridian, skip split here (rare with 8 bands from -180)
      if (bWest > bEast) {
        promises.push(rpcCats(south, bWest, north, 180, Math.ceil(perBand / 2), rowOffset + i));
        promises.push(rpcCats(south, -180, north, bEast, Math.ceil(perBand / 2), rowOffset + i));
      } else {
        promises.push(rpcCats(south, bWest, north, bEast, perBand, rowOffset + i * 17));
      }
    }

    const results = await Promise.all(promises);
    const cats = results.flat();

    // Dedupe by id and shuffle
    const seen = new Set<number>();
    const unique: Cat[] = [];
    for (const c of cats) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique.slice(0, limit);
  }

  // Normal (zoomed-in) view: single query
  const cats = await rpcCats(south, west, north, east, limit, rowOffset);
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
  // Demo / no-Stripe path: update directly via Supabase (RLS allows it)
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
