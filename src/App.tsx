import { useState, useEffect, useCallback } from "react";
import { WorldMap } from "@/components/WorldMap";
import { ShareReceipt } from "@/components/ShareReceipt";
import { StatsCounter } from "@/components/StatsCounter";
import { CatModal } from "@/components/CatModal";
import { fetchStats, fetchLatestHappyCats, confirmCheckoutSession, fetchCatById } from "@/lib/api";
import { loadReceipts, saveReceipt, type CatReceipt } from "@/lib/receipts";
import type { Cat, GlobalStats } from "@/lib/supabase";

function App() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"home" | "map">("home");
  const [latestHappy, setLatestHappy] = useState<Cat[]>([]);
  const [myReceipts, setMyReceipts] = useState<CatReceipt[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchStats();
      if (s) setStats(s);
      const happy = await fetchLatestHappyCats(12);
      setLatestHappy(happy);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    setMyReceipts(loadReceipts());
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const happyId = params.get("happy");
    const sessionId = params.get("session_id");
    const cancelled = params.get("cancelled");

    if (cancelled) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!happyId && !sessionId) return;

    (async () => {
      // Prefer confirming via Stripe session (works even if webhook failed)
      if (sessionId) {
        const result = await confirmCheckoutSession(sessionId);
        if (result.success && result.catId) {
          const cat = await fetchCatById(result.catId);
          if (cat) {
            saveReceipt(cat, result.name || cat.name || undefined);
            setSelectedCat(cat);
          }
          setMyReceipts(loadReceipts());
        }
      } else if (happyId) {
        const id = parseInt(happyId, 10);
        if (!Number.isNaN(id)) {
          const cat = await fetchCatById(id);
          if (cat) {
            if (cat.mood === "happy") {
              saveReceipt(cat, cat.name || undefined);
              setMyReceipts(loadReceipts());
            }
            setSelectedCat(cat);
          }
        }
      }

      await loadStats();
      setRefreshKey((k) => k + 1);
      setView("map");
      window.history.replaceState({}, "", window.location.pathname);
    })();
  }, [loadStats]);

  const handleCatClick = useCallback((cat: Cat) => {
    setSelectedCat(cat);
  }, []);

  const handleMadeHappy = useCallback(() => {
    loadStats();
    setMyReceipts(loadReceipts());
    setRefreshKey((k) => k + 1);
  }, [loadStats]);

  const angry = stats?.angry_cats ?? 1000000;
  const happy = stats?.happy_cats ?? 0;

  if (view === "map") {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#140f0e]">
        <WorldMap onCatClick={handleCatClick} refreshKey={refreshKey} />

        <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
          <div className="flex items-start justify-between p-3 md:p-4 gap-3">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setView("home")}
                className="rounded-full border border-white/10 bg-[#140f0e]/80 backdrop-blur-md px-4 py-2 text-sm text-[#f6efe6] hover:bg-white/10 transition"
              >
                ← Home
              </button>
              <div className="hidden sm:block rounded-full border border-white/10 bg-[#140f0e]/80 backdrop-blur-md px-4 py-2">
                <span className="font-display font-bold text-[#f6efe6]">Million Angry Cats</span>
              </div>
            </div>
            <div className="pointer-events-auto">
              <StatsCounter stats={stats} compact />
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <p className="rounded-full bg-[#140f0e]/75 backdrop-blur-md border border-white/10 px-4 py-2 text-xs text-white/50 text-center">
            Click any cat. Bribe it. Name it. Survive.
          </p>
        </div>

        <CatModal
          cat={selectedCat}
          onClose={() => setSelectedCat(null)}
          onMadeHappy={handleMadeHappy}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6efe6] text-[#140f0e]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#140f0e]/10 bg-[#f6efe6]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="text-2xl" aria-hidden>😾</span>
            <span className="hidden xs:inline sm:inline">1,000,000 ANGRY CATS</span>
            <span className="sm:hidden">ANGRY CATS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#140f0e]/70">
            <a href="#how" className="hover:text-[#140f0e]">How it works</a>
            <a href="#why" className="hover:text-[#140f0e]">What you get</a>
            <a href="#receipts" className="hover:text-[#140f0e]">My receipts</a>
            <a href="#map-cta" className="hover:text-[#140f0e]">The map</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end text-[10px] leading-tight mr-1">
              <span className="text-[#140f0e]/45 uppercase tracking-wider">Still furious</span>
              <span className="font-bold tabular-nums text-[#ff5c5c]">
                {statsLoading ? "…" : angry.toLocaleString()}
              </span>
            </div>
            <button onClick={() => setView("map")} className="btn-primary text-sm py-2.5 px-5">
              Bribe a cat →
            </button>
            <button
              type="button"
              className="md:hidden rounded-full border border-[#140f0e]/15 w-10 h-10 flex items-center justify-center"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#140f0e]/10 px-4 py-3 flex flex-col gap-3 text-sm font-semibold">
            <a href="#how" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#why" onClick={() => setMobileOpen(false)}>What you get</a>
            <a href="#receipts" onClick={() => setMobileOpen(false)}>My receipts</a>
            <a href="#map-cta" onClick={() => setMobileOpen(false)}>The map</a>
            <button
              type="button"
              className="text-left text-[#ff5c5c]"
              onClick={() => {
                setMobileOpen(false);
                setView("map");
              }}
            >
              Open map →
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#140f0e]/10 bg-white/60 px-3 py-1 text-xs font-semibold text-[#140f0e]/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c5c] animate-pulse" />
            {angry.toLocaleString()} cats have not forgiven you
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-6">
            MAKE ONE CAT
            <span className="block mt-2">
              <span className="bg-[#ff5c5c] text-[#f6efe6] px-4 py-1 rounded-2xl inline-block -rotate-1">
                LESS HOMICIDAL
              </span>
            </span>
          </h1>
          <p className="max-w-xl mx-auto text-lg md:text-xl text-[#140f0e]/65 leading-relaxed mb-8">
            One million cats. Scattered across Earth. All furious.
            For <strong className="text-[#140f0e]">$0.50</strong> you can bribe one,
            name it, and rent its affection forever*.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => setView("map")} className="btn-primary text-lg px-8">
              Find a furious cat →
            </button>
            <a
              href="#how"
              className="rounded-full border-2 border-[#140f0e]/15 px-7 py-3.5 font-display font-bold text-[#140f0e]/70 hover:border-[#140f0e]/40 transition"
            >
              How the bribe works
            </a>
          </div>
          <p className="text-xs text-[#140f0e]/40 mt-4">
            *Forever is a legal term meaning “until the next Zoom call.”
          </p>

          {/* Decorative cat row */}
          <div className="mt-14 flex justify-center gap-3 md:gap-5 text-5xl md:text-6xl select-none">
            {["😾", "😼", "🙀", "😿", "😾", "😹", "😾"].map((e, i) => (
              <span
                key={i}
                className="animate-float inline-block"
                style={{ animationDelay: `${i * 0.25}s` }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Live stats strip */}
      <section className="border-y border-[#140f0e]/10 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Total cats", value: (stats?.total_cats ?? 1000000).toLocaleString() },
            { label: "Still angry", value: angry.toLocaleString(), accent: "text-[#ff5c5c]" },
            { label: "Successfully bribed", value: happy.toLocaleString(), accent: "text-amber-600" },
            { label: "Cost of peace", value: "$0.50" },
          ].map((item) => (
            <div key={item.label}>
              <div className={`font-display text-3xl font-bold tabular-nums ${item.accent ?? ""}`}>
                {item.value}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#140f0e]/45 mt-1 font-semibold">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
          How to survive a cat
        </h2>
        <p className="text-center text-[#140f0e]/55 mb-12 max-w-lg mx-auto">
          Three steps. Zero dignity required.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Hunt on the map",
              body: "Open the world map. Zoom into Singapore, Antarctica, your hometown — every landmass has judgmental cats.",
            },
            {
              step: "02",
              title: "Get roasted",
              body: "Click one. It will insult you. This is scientifically accurate cat behavior.",
            },
            {
              step: "03",
              title: "Bribe & name",
              body: "Pay $0.50, give it a ridiculous name, and watch the frown invert. Peace (probationary) achieved.",
            },
          ].map((card) => (
            <div
              key={card.step}
              className="rounded-3xl border border-[#140f0e]/10 bg-white/70 p-6 shadow-sm hover:-translate-y-1 transition"
            >
              <div className="font-display text-sm font-bold text-[#ff5c5c] mb-3">{card.step}</div>
              <h3 className="font-display text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-[#140f0e]/60 leading-relaxed text-sm">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="why" className="bg-[#140f0e] text-[#f6efe6] py-20">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-5">
              What you actually get for fifty cents
            </h2>
            <ul className="space-y-4 text-[#f6efe6]/75">
              <li className="flex gap-3">
                <span className="text-[#ff5c5c] font-bold">→</span>
                <span><strong className="text-[#f6efe6]">A real location.</strong> Every cat sits on actual land — zoom from Singapore to Siberia and find a new grudge.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#ff5c5c] font-bold">→</span>
                <span><strong className="text-[#f6efe6]">Naming rights.</strong> Call it “Tax Fraud” or “Loaf Supreme.” The cat will pretend not to care.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#ff5c5c] font-bold">→</span>
                <span><strong className="text-[#f6efe6]">A public truce.</strong> Their mood flips from furious to smug. The whole map can witness your diplomacy.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#ff5c5c] font-bold">→</span>
                <span><strong className="text-[#f6efe6]">Bragging rights.</strong> You paid half a dollar to calm chaos. That’s either charity or a cry for help.</span>
              </li>
            </ul>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-[#1c1513] p-8 text-center">
            <div className="text-7xl mb-4 animate-bounce-slow">😾</div>
            <p className="font-display text-2xl font-bold mb-2">“I didn’t ask to be mapped.”</p>
            <p className="text-sm text-white/45">— Cat #48291, somewhere over France</p>
          </div>
        </div>
      </section>

      {/* Map CTA */}
      <section id="map-cta" className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
          The world is full of tiny enemies
        </h2>
        <p className="text-[#140f0e]/55 mb-8 max-w-md mx-auto">
          Open the live map. Pick a continent. Start diplomatic negotiations at $0.50 a head.
        </p>
        <button onClick={() => setView("map")} className="btn-primary text-lg px-10">
          Enter the map of rage →
        </button>
      </section>



      {/* My receipts — bragging rights */}
      <section id="receipts" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Your truce receipts
            </h2>
            <p className="text-[#140f0e]/55 mt-1">
              Cats you&apos;ve bribed on this device. Flash these as bragging rights.
            </p>
          </div>
          {myReceipts.length > 0 && (
            <span className="text-sm font-semibold text-[#ff5c5c]">
              {myReceipts.length} sealed
            </span>
          )}
        </div>

        {myReceipts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#140f0e]/15 bg-white/60 p-10 text-center text-[#140f0e]/50">
            No receipts yet. Bribe a cat on the map and your proof shows up here.
            <div className="mt-4">
              <button onClick={() => setView("map")} className="btn-primary text-sm py-2.5 px-5">
                Bribe a cat →
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myReceipts.map((r) => (
              <div
                key={`${r.id}-${r.bribed_at}`}
                className="rounded-3xl border border-[#140f0e]/10 bg-white/80 p-5 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 text-6xl opacity-10 -mr-2 -mt-2">😻</div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-700/80 mb-2">
                  Truce receipt
                </p>
                <h3 className="font-display text-xl font-bold truncate">
                  {r.name?.trim() || `Cat #${r.id}`}
                </h3>
                <p className="text-xs text-[#140f0e]/45 mt-0.5">Serial #{r.id}</p>
                <div className="mt-3 space-y-1 text-sm text-[#140f0e]/65">
                  <div>{r.lat.toFixed(3)}°, {r.lng.toFixed(3)}°</div>
                  <div>
                    {new Date(r.bribed_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <div className="mt-4">
                  <ShareReceipt receipt={r} variant="light" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Latest happy cats */}
      <section className="border-t border-[#140f0e]/10 bg-white/40 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Latest truces
              </h2>
              <p className="text-[#140f0e]/55 mt-1">
                Cats that recently accepted a bribe. Yellow on the map means they&apos;re still (smugly) happy.
              </p>
            </div>
            <button
              onClick={() => setView("map")}
              className="text-sm font-semibold text-[#ff5c5c] hover:underline self-start"
            >
              Find them on the map →
            </button>
          </div>

          {latestHappy.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#140f0e]/15 bg-white/60 p-10 text-center text-[#140f0e]/50">
              No happy cats yet. Be the first to bribe one.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {latestHappy.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className="rounded-2xl border border-[#140f0e]/10 bg-white/80 p-4 text-left hover:-translate-y-0.5 hover:shadow-md transition"
                >
                  <div className="text-3xl mb-2">😻</div>
                  <div className="font-display font-bold text-sm truncate">
                    {cat.name?.trim() || `Cat #${cat.id}`}
                  </div>
                  <div className="text-[11px] text-[#140f0e]/45 mt-1">
                    {cat.lat.toFixed(1)}°, {cat.lng.toFixed(1)}°
                  </div>
                  {cat.made_happy_at && (
                    <div className="text-[10px] text-amber-700/70 mt-1">
                      {new Date(cat.made_happy_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[#140f0e]/10 py-10 text-center text-sm text-[#140f0e]/40">
        <p className="font-display font-bold text-[#140f0e]/70 mb-2">Million Angry Cats</p>
        <p>Not affiliated with any real cats. They already have lawyers.</p>
        <p className="mt-2">{happy.toLocaleString()} truces signed · {angry.toLocaleString()} grudges ongoing</p>
      </footer>

      <CatModal
        cat={selectedCat}
        onClose={() => setSelectedCat(null)}
        onMadeHappy={handleMadeHappy}
      />
    </div>
  );
}

export default App;
