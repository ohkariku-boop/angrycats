import { useState, useEffect } from "react";
import { type Cat } from "@/lib/supabase";
import { makeCatHappyViaStripe, makeCatHappyDirect } from "@/lib/api";
import { CatIcon } from "./CatIcon";

type CatModalProps = {
  cat: Cat | null;
  onClose: () => void;
  onMadeHappy: () => void;
};

export function CatModal({ cat, onClose, onMadeHappy }: CatModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    setError(null);
    setName("");
  }, [cat]);

  if (!cat) return null;

  const isHappy = cat.mood === "happy";

  const handleMakeHappy = async () => {
    if (!cat || isHappy) return;
    setProcessing(true);
    setError(null);

    try {
      const url = await makeCatHappyViaStripe(cat.id);
      if (url) {
        window.location.href = url;
        return;
      }
      // Stripe not configured — fallback to direct (demo mode)
      setStripeConfigured(false);
      const success = await makeCatHappyDirect(cat.id, name);
      if (success) {
        onMadeHappy();
        onClose();
      } else {
        setError("Could not adopt this cat. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl border border-white/10 p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 animate-bounce-slow">
            <CatIcon mood={cat.mood} size={120} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {isHappy
              ? cat.name
                ? `${cat.name} is happy!`
                : "This cat is happy!"
              : "This cat is angry!"}
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            {isHappy
              ? cat.name
                ? `Someone adopted ${cat.name} for $0.50 and made them happy. Look at that smile!`
                : "Someone already paid $0.50 to adopt this cat and make them happy."
              : "This angry cat needs a home. For just $0.50 you can adopt them, give them a name, and turn that grumpy frown upside down."}
          </p>

          <div className="flex gap-4 text-xs text-gray-500 mb-6">
            <span>Lat: {cat.lat.toFixed(4)}</span>
            <span>Lng: {cat.lng.toFixed(4)}</span>
            <span>ID: #{cat.id}</span>
          </div>

          {isHappy ? (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-bold text-lg hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg"
            >
              Close
            </button>
          ) : (
            <>
              <div className="w-full mb-4">
                <label
                  htmlFor="cat-name"
                  className="block text-left text-sm text-gray-400 mb-1.5"
                >
                  Name your cat (optional)
                </label>
                <input
                  id="cat-name"
                  type="text"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grumpy, Mittens, Chaos..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition"
                />
              </div>

              <button
                onClick={handleMakeHappy}
                disabled={processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-lg hover:from-pink-400 hover:to-rose-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing
                  ? "Processing..."
                  : name.trim()
                    ? `Adopt ${name.trim()} for $0.50`
                    : "Adopt & Make Happy for $0.50"}
              </button>
              {!stripeConfigured && (
                <p className="text-xs text-amber-400/70 mt-3">
                  Stripe is not configured yet. Cat was adopted for free (demo
                  mode).
                </p>
              )}
              {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
