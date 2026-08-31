# Million Angry Cats

1 million (well, ~95k seeded for now) angry cats scattered across the world's landmasses.  
Pay **$0.50** to adopt a cat, give it a name, and make it happy.

## Stack

- React + Vite + TypeScript + Tailwind
- Leaflet world map
- Supabase (Postgres + PostGIS + Edge Functions)
- Optional Stripe checkout for real payments

## Setup

1. **Supabase** – Project already provisioned at  
   `https://vfbklmpjxlwwvepktqbj.supabase.co`

2. Copy your **anon public** key from the Supabase dashboard:  
   Project Settings → API → `anon` `public` key

3. Put it in `.env`:

```env
VITE_SUPABASE_URL=https://vfbklmpjxlwwvepktqbj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

4. Install & run:

```bash
npm install
npm run dev
```

## Database

Schema, land polygons, `get_random_cats` RPC, and stats trigger are already applied.

Current seed: ~95k cats on land. To add more:

```sql
SELECT seed_cats(10000);  -- run multiple times
```

## Edge Function (optional, for Stripe)

Deploy `supabase/functions/make-cat-happy` and set secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (optional)
- `APP_URL` (your frontend URL)

Without Stripe the app falls back to free “demo” adoption (still names the cat and updates mood).

## GitHub

Repo: https://github.com/ohkariku-boop/angrycats
