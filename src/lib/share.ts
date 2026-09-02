import type { CatReceipt } from "./receipts";

export function receiptShareText(r: CatReceipt): string {
  const label = r.name?.trim() || `Cat #${r.id}`;
  return (
    `I bribed an angry cat on Million Angry Cats!\n` +
    `${label} · #${r.id}\n` +
    `${r.lat.toFixed(2)}°, ${r.lng.toFixed(2)}°\n` +
    `Truce sealed. $0.50 well spent.\n` +
    `https://ohkariku-boop.github.io/angrycats/`
  );
}

export function shareUrls(r: CatReceipt) {
  const text = receiptShareText(r);
  const encoded = encodeURIComponent(text);
  const page = encodeURIComponent("https://ohkariku-boop.github.io/angrycats/");
  return {
    whatsapp: `https://wa.me/?text=${encoded}`,
    telegram: `https://t.me/share/url?url=${page}&text=${encoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${page}&quote=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
    // Instagram has no web share-for-feed API; open IG and user pastes
    instagram: "https://www.instagram.com/",
  };
}

/** Minimal single-page PDF (no external deps) */
export function downloadReceiptPdf(r: CatReceipt): void {
  const label = r.name?.trim() || `Cat #${r.id}`;
  const when = new Date(r.bribed_at).toLocaleString();
  const lines = [
    "MILLION ANGRY CATS",
    "OFFICIAL TRUCE RECEIPT",
    "",
    `Cat: ${label}`,
    `Serial: #${r.id}`,
    `Coordinates: ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
    `Bribed: ${when}`,
    "",
    "Amount: USD 0.50",
    "Status: CEASEFIRE (probationary)",
    "",
    "Valid for bragging rights worldwide.",
    "Cat may still ignore you in person.",
    "",
    "https://ohkariku-boop.github.io/angrycats/",
  ];

  const escapePdf = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const contentLines: string[] = ["BT", "/F1 12 Tf", "50 750 Td", "16 TL"];
  lines.forEach((line, i) => {
    if (i === 0) {
      contentLines.push(`/F1 18 Tf (${escapePdf(line)}) Tj`, "T*");
      contentLines.push(`/F1 12 Tf`);
    } else {
      contentLines.push(`(${escapePdf(line)}) Tj`, "T*");
    }
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
  );
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `truce-receipt-cat-${r.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function nativeShare(r: CatReceipt): Promise<boolean> {
  const text = receiptShareText(r);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "Million Angry Cats — Truce Receipt",
        text,
        url: "https://ohkariku-boop.github.io/angrycats/",
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
