import { type GlobalStats } from "@/lib/supabase";
import { CatIcon } from "./CatIcon";

type StatsCounterProps = {
  stats: GlobalStats | null;
};

export function StatsCounter({ stats }: StatsCounterProps) {
  const total = stats?.total_cats ?? 1000000;
  const happy = stats?.happy_cats ?? 0;
  const angry = stats?.angry_cats ?? total;
  const happyPct = total > 0 ? (happy / total) * 100 : 0;
  const angryPct = total > 0 ? (angry / total) * 100 : 100;

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CatIcon mood="angry" size={28} />
          <span className="text-2xl font-bold text-red-400 tabular-nums">
            {angry.toLocaleString()}
          </span>
          <span className="text-sm text-red-400/70 font-medium">angry</span>
        </div>
        <div className="text-white/30 text-xl font-light">vs</div>
        <div className="flex items-center gap-2">
          <CatIcon mood="happy" size={28} />
          <span className="text-2xl font-bold text-yellow-400 tabular-nums">
            {happy.toLocaleString()}
          </span>
          <span className="text-sm text-yellow-400/70 font-medium">happy</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full overflow-hidden bg-red-500/30 flex">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-700 ease-out"
          style={{ width: `${happyPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-red-400/60">{angryPct.toFixed(2)}% angry</span>
        <span className="text-yellow-400/60">{happyPct.toFixed(4)}% happy</span>
      </div>
    </div>
  );
}
