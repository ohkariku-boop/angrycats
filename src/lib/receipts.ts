import type { Cat } from "./supabase";

const STORAGE_KEY = "angrycats_receipts_v1";

export type CatReceipt = {
  id: number;
  name: string | null;
  lat: number;
  lng: number;
  made_happy_at: string;
  bribed_at: string;
};

export function loadReceipts(): CatReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CatReceipt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReceipt(cat: Cat, name?: string): CatReceipt {
  const receipt: CatReceipt = {
    id: cat.id,
    name: (name?.trim() || cat.name || null) as string | null,
    lat: cat.lat,
    lng: cat.lng,
    made_happy_at: cat.made_happy_at || new Date().toISOString(),
    bribed_at: new Date().toISOString(),
  };

  const existing = loadReceipts().filter((r) => r.id !== receipt.id);
  const next = [receipt, ...existing].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return receipt;
}

export function receiptShareText(r: CatReceipt): string {
  const label = r.name?.trim() || `Cat #${r.id}`;
  return (
    `I bribed an angry cat.\n` +
    `${label} · #${r.id}\n` +
    `${r.lat.toFixed(2)}°, ${r.lng.toFixed(2)}°\n` +
    `Truce sealed on Million Angry Cats.`
  );
}
