import { useState } from "react";
import type { CatReceipt } from "@/lib/receipts";
import {
  downloadReceiptPdf,
  nativeShare,
  shareUrls,
  receiptShareText,
} from "@/lib/share";

type Props = {
  receipt: CatReceipt;
  /** dark = map modal, light = home page cards */
  variant?: "dark" | "light";
};

export function ShareReceipt({ receipt, variant = "dark" }: Props) {
  const [copied, setCopied] = useState(false);
  const urls = shareUrls(receipt);
  const isDark = variant === "dark";

  const btn = isDark
    ? "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#f6efe6] hover:bg-white/10 transition"
    : "rounded-xl border border-[#140f0e]/12 bg-white px-3 py-2 text-xs font-semibold text-[#140f0e] hover:bg-[#140f0e]/5 transition";

  const primary = isDark
    ? "rounded-xl bg-[#ffc857] text-[#140f0e] px-3 py-2 text-xs font-bold hover:brightness-110 transition"
    : "rounded-xl bg-[#ff5c5c] text-white px-3 py-2 text-xs font-bold hover:brightness-110 transition";

  const open = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptShareText(receipt));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={primary} onClick={() => downloadReceiptPdf(receipt)}>
          Download PDF
        </button>
        <button
          type="button"
          className={btn}
          onClick={async () => {
            const shared = await nativeShare(receipt);
            if (!shared) await copyText();
          }}
        >
          Share…
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <button type="button" className={btn} onClick={() => open(urls.whatsapp)}>
          WhatsApp
        </button>
        <button type="button" className={btn} onClick={() => open(urls.telegram)}>
          Telegram
        </button>
        <button type="button" className={btn} onClick={() => open(urls.facebook)}>
          Facebook
        </button>
        <button type="button" className={btn} onClick={() => open(urls.twitter)}>
          X
        </button>
        <button
          type="button"
          className={btn}
          onClick={async () => {
            await copyText();
            open(urls.instagram);
          }}
          title="Instagram has no web share for posts — we copy your brag text, then open Instagram so you can paste"
        >
          Instagram
        </button>
      </div>
      {copied && (
        <p className={`text-[11px] text-center ${isDark ? "text-[#ffc857]" : "text-amber-700"}`}>
          Brag text copied — paste it into Instagram or anywhere else.
        </p>
      )}
    </div>
  );
}
