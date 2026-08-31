import { useState, useEffect, useCallback } from "react";
import { WorldMap } from "@/components/WorldMap";
import { StatsCounter } from "@/components/StatsCounter";
import { CatModal } from "@/components/CatModal";
import { fetchStats, fetchCatById } from "@/lib/api";
import type { Cat, GlobalStats } from "@/lib/supabase";

function App() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = useCallback(async () => {
    const s = await fetchStats();
    if (s) setStats(s);
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Check for ?happy=ID param (returning from Stripe checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const happyId = params.get("happy");
    if (happyId) {
      // The webhook should have updated the cat; refresh stats and map
      loadStats();
      setRefreshKey((k) => k + 1);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadStats]);

  const handleCatClick = useCallback((cat: Cat) => {
    setSelectedCat(cat);
  }, []);

  const handleMadeHappy = useCallback(() => {
    loadStats();
    setRefreshKey((k) => k + 1);
  }, [loadStats]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Map fills the screen */}
      <WorldMap onCatClick={handleCatClick} refreshKey={refreshKey} />

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="flex items-start justify-between p-4 gap-4">
          {/* Title */}
          <div className="pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 px-5 py-3 shadow-2xl">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Million Angry Cats
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Adopt them for $0.50 each
              </p>
            </div>
          </div>

          {/* Stats counter */}
          <div className="pointer-events-auto">
            <StatsCounter stats={stats} />
          </div>
        </div>
      </div>

      {/* Cat detail modal */}
      <CatModal
        cat={selectedCat}
        onClose={() => setSelectedCat(null)}
        onMadeHappy={handleMadeHappy}
      />
    </div>
  );
}

export default App;
