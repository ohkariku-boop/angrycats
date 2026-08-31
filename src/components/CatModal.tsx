import { useState, useEffect, useMemo } from "react";
import { type Cat } from "@/lib/supabase";
import { makeCatHappyDirect } from "@/lib/api";
import { saveReceipt, type CatReceipt } from "@/lib/receipts";
import { CatIcon } from "./CatIcon";

type CatModalProps = {
  cat: Cat | null;
  onClose: () => void;
  onMadeHappy: () => void;
};

const ANGRY_LINES = [
  "I knocked your keys off the table on purpose.",
  "Your Wi‑Fi password is my enemy.",
  "I have judged every outfit you've ever worn.",
  "That plant died because of me. You're welcome.",
  "I am three raccoons in a trench coat of rage.",
  "I peed in your favorite shoes. Spiritually.",
  "Birds are a government conspiracy and I'm still mad.",
  "I will never forgive the vacuum.",
  "Your laser pointer debts are compounding interest.",
  "I stared at you for 4 hours. It was hate.",
];

const HAPPY_LINES = [
  "Fine. You're acceptable. For now.",
  "I have decided to tolerate civilization.",
  "The void can wait. I have a name.",
  "Still better than dogs. Don't push it.",
  "My rage is nap-shaped today.",
  "You may pet me. Once. Maybe.",
];

function randomLine(lines: string[], seed: number) {
  return lines[Math.abs(seed) % lines.length];
}

export function CatModal({ cat, onClose, onMadeHappy }: CatModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lastReceipt, setLastReceipt] = useState<CatReceipt | null>(null);

  useEffect(() => {
    setError(null);
    setName("");
    setLastReceipt(null);
  }, [cat]);

  const quote = useMemo(() => {
    if (!cat) return "";
    return cat.mood === "happy"
      ? randomLine(HAPPY_LINES, cat.id)
      : randomLine(ANGRY_LINES, cat.id);
  }, [cat]);

  if (!cat) return null;

  const isHappy = cat.mood === "happy";

  const handleMakeHappy = async () => {
    if (!cat || isHappy) return;
    setProcessing(true);
    setError(null);

    try {
      // Demo mode: direct update, no Stripe
      const success = await makeCatHappyDirect(cat.id, name);
      if (success) {
        const receipt = saveReceipt(cat, name);
        setLastReceipt(receipt);
        onMadeHappy();
      } else {
        setError("This cat rejected your offering. Try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Something broke. The cat is smugly unsurprised.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1513] rounded-[28px] border border-white/10 p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#ff5c5c]/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[#ffc857]/10 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-3 animate-bounce-slow">
            <CatIcon mood={cat.mood} size={120} />
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-[#ff5c5c] font-semibold mb-2">
            {isHappy ? "Adopted · Off the warpath" : "Currently furious"}
          </p>

          <h2 className="font-display text-2xl font-bold text-[#f6efe6] mb-2">
            {isHappy
              ? cat.name
                ? `${cat.name}`
                : "A reformed menace"
              : "Untitled menace"}
          </h2>

          <blockquote className="text-[#c4b8ae] text-sm italic mb-5 max-w-xs leading-relaxed">
            “{quote}”
          </blockquote>

          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-white/40 mb-5">
            <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
              #{cat.id}
            </span>
            <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
              {cat.lat.toFixed(2)}°, {cat.lng.toFixed(2)}°
            </span>
          </div>

          {lastReceipt ? (
            <div className="w-full text-left space-y-3">
              <div className="rounded-2xl border border-[#ffc857]/30 bg-[#ffc857]/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#ffc857] font-bold mb-2">
                  Official truce receipt
                </p>
                <p className="font-display text-xl font-bold text-[#f6efe6]">
                  {lastReceipt.name?.trim() || `Cat #${lastReceipt.id}`}
                </p>
                <p className="text-xs text-white/45 mt-1">Serial #{lastReceipt.id}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/60">
                  <div>
                    <div className="text-white/30 uppercase text-[10px]">Coordinates</div>
                    {lastReceipt.lat.toFixed(3)}°, {lastReceipt.lng.toFixed(3)}°
                  </div>
                  <div>
                    <div className="text-white/30 uppercase text-[10px]">Bribed</div>
                    {new Date(lastReceipt.bribed_at).toLocaleString()}
                  </div>
                </div>
                <p className="text-[11px] text-white/40 mt-3 italic">
                  Valid for bragging rights. Cat may still ignore you in person.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const text = `I bribed an angry cat.\n${lastReceipt.name?.trim() || "Cat #" + lastReceipt.id} · #${lastReceipt.id}\n${lastReceipt.lat.toFixed(2)}°, ${lastReceipt.lng.toFixed(2)}°\nTruce sealed on Million Angry Cats.`;
                  try {
                    await navigator.clipboard.writeText(text);
                  } catch {
                    /* ignore */
                  }
                  onClose();
                }}
                className="w-full py-3.5 rounded-full bg-[#ffc857] text-[#140f0e] font-display font-bold text-lg hover:brightness-110 transition"
              >
                Copy brag & close
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm text-white/40 hover:text-white/70"
              >
                Close
              </button>
            </div>
          ) : isHappy ? (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-[#ffc857] text-[#140f0e] font-display font-bold text-lg hover:brightness-110 transition"
            >
              Leave while they're still nice
            </button>
          ) : (
            <>
              <div className="w-full mb-4 text-left">
                <label htmlFor="cat-name" className="block text-sm text-[#c4b8ae] mb-1.5">
                  Name this chaos agent
                </label>
                <input
                  id="cat-name"
                  type="text"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tax Evasion, Sir Hiss, Loaf..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[#f6efe6] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#ff5c5c]/50"
                />
              </div>

              <button
                onClick={handleMakeHappy}
                disabled={processing}
                className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing
                  ? "Negotiating ceasefire..."
                  : name.trim()
                    ? `Bribe “${name.trim()}” — $0.50`
                    : "Bribe this cat — $0.50"}
              </button>
              <p className="text-[11px] text-white/35 mt-3">
                Includes naming rights, one (1) temporary truce, and zero apologies from the cat.
              </p>
              <p className="text-xs text-[#ffc857]/80 mt-2">
                Demo mode — no payment charged. Stripe can be wired up later.
              </p>
              {error && <p className="text-sm text-[#ff5c5c] mt-3">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
