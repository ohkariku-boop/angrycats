import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Cat = {
  id: number;
  lat: number;
  lng: number;
  mood: "angry" | "happy";
  name: string | null;
  made_happy_at: string | null;
};

export type GlobalStats = {
  id: number;
  total_cats: number;
  happy_cats: number;
  angry_cats: number;
  updated_at: string;
};
