import { CatIcon } from "./CatIcon";
import { ShareReceipt } from "./ShareReceipt";
import type { CatReceipt } from "@/lib/receipts";

type Props = {
  receipt: CatReceipt;
  onViewMap: () => void;
  onHome: () => void;
};

const QUIPS = [
  "The void will miss their rage.",
  "One less lawsuit against humanity.",
  "They accept your tribute. Reluctantly.",
  "History will remember this ceasefire.",
  "The laser pointer debts are… paused.",
];

export function ThankYou({ receipt, onViewMap, onHome }: Props) {
  const label = receipt.name?.trim() || `Cat #${receipt.id}`;
  const quip = QUIPS[Math.abs(receipt.id) % QUIPS.length];

  return (
    <div className="min-h-screen bg-[#140f0e] text-[#f6efe6] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-[32px] border border-white/10 bg-[#1c1513] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#ffc857]/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-[#ff5c5c]/10 blur-3xl" />

          <div className="relative text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#ffc857] font-bold mb-3">
              Payment received · Truce sealed
            </p>
            <div className="flex justify-center mb-4 animate-bounce-slow">
              <CatIcon mood="happy" size={100} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Thank you!
            </h1>
            <p className="text-lg text-[#f6efe6]/80 mb-1">
              <span className="text-[#ffc857] font-semibold">{label}</span> is
              officially less homicidal.
            </p>
            <p className="text-sm text-white/45 italic mb-6">“{quip}”</p>

            <div className="rounded-2xl border border-[#ffc857]/25 bg-[#ffc857]/10 p-4 text-left mb-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#ffc857] font-bold mb-2">
                Your truce receipt
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-white/35 text-[10px] uppercase">Serial</div>
                  <div className="font-semibold">#{receipt.id}</div>
                </div>
                <div>
                  <div className="text-white/35 text-[10px] uppercase">Amount</div>
                  <div className="font-semibold">$0.50 USD</div>
                </div>
                <div>
                  <div className="text-white/35 text-[10px] uppercase">Location</div>
                  <div className="font-semibold">
                    {receipt.lat.toFixed(2)}°, {receipt.lng.toFixed(2)}°
                  </div>
                </div>
                <div>
                  <div className="text-white/35 text-[10px] uppercase">Sealed</div>
                  <div className="font-semibold">
                    {new Date(receipt.bribed_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/40 mb-3 text-left">Share the peace:</p>
            <ShareReceipt receipt={receipt} variant="dark" />

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onViewMap}
                className="flex-1 rounded-full bg-[#ffc857] text-[#140f0e] font-display font-bold py-3.5 hover:brightness-110 transition"
              >
                See them on the map →
              </button>
              <button
                type="button"
                onClick={onHome}
                className="flex-1 rounded-full border border-white/15 py-3.5 font-semibold text-sm hover:bg-white/5 transition"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-white/30 mt-4">
          Charged by Chonkiee via Stripe · Digital truce · No cats were emailed
        </p>
      </div>
    </div>
  );
}
