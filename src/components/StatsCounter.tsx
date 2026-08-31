import { type GlobalStats } from "@/lib/supabase";

type StatsCounterProps = {
  stats: GlobalStats | null;
  compact?: boolean;
};

export function StatsCounter({ stats, compact }: StatsCounterProps) {
  const total = stats?.total_cats ?? 1000000;
  const happy = stats?.happy_cats ?? 0;
  const angry = stats?.angry_cats ?? total;
  const happyPct = total > 0 ? (happy / total) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#140f0e]/80 backdrop-blur-md px-3 py-1.5 text-xs">
        <span className="text-[#ff5c5c] font-semibold tabular-nums">
          {angry.toLocaleString()}
        </span>
        <span className="text-white/40">still furious</span>
        <span className="text-white/20">·</span>
        <span className="text-[#ffc857] font-semibold tabular-nums">
          {happy.toLocaleString()}
        </span>
        <span className="text-white/40">bribed</span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1c1513]/90 backdrop-blur-md p-5 shadow-2xl min-w-[260px]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3 font-semibold">
        Global cat mood
      </p>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <div className="text-3xl font-display font-bold text-[#ff5c5c] tabular-nums leading-none">
            {angry.toLocaleString()}
          </div>
          <div className="text-xs text-[#ff5c5c]/70 mt-1">still plotting</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display font-bold text-[#ffc857] tabular-nums leading-none">
            {happy.toLocaleString()}
          </div>
          <div className="text-xs text-[#ffc857]/70 mt-1">temporarily chill</div>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden bg-[#ff5c5c]/25">
        <div
          className="h-full bg-gradient-to-r from-[#ffc857] to-[#ffe29a] transition-all duration-700"
          style={{ width: `${Math.max(happyPct, happy > 0 ? 0.5 : 0)}%` }}
        />
      </div>
      <p className="text-[11px] text-white/35 mt-2">
        {happyPct < 0.01
          ? "Civilization is losing."
          : `${happyPct.toFixed(4)}% of cats have accepted a bribe.`}
      </p>
    </div>
  );
}
