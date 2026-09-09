import type { CatReceipt } from "./receipts";

const SITE = "https://angrycats.vercel.app/";

export function receiptShareText(r: CatReceipt): string {
  const label = r.name?.trim() || `Cat #${r.id}`;
  return (
    `I bribed an angry cat on Million Angry Cats!\n` +
    `${label} · #${r.id}\n` +
    `${r.lat.toFixed(2)}°, ${r.lng.toFixed(2)}°\n` +
    `Truce sealed. $0.99 well spent.\n` +
    SITE
  );
}

export function shareUrls(r: CatReceipt) {
  const text = receiptShareText(r);
  const encoded = encodeURIComponent(text);
  const page = encodeURIComponent(SITE);
  return {
    whatsapp: `https://wa.me/?text=${encoded}`,
    telegram: `https://t.me/share/url?url=${page}&text=${encoded}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${page}&quote=${encoded}`,
    twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
    instagram: "https://www.instagram.com/",
  };
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Certificate-style single-page PDF with Angry Cats mark (top right) */
export function downloadReceiptPdf(r: CatReceipt): void {
  const label = r.name?.trim() || `Cat #${r.id}`;
  const when = new Date(r.bribed_at).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const coords = `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;

  // Page: 612 x 792 (letter). Certificate frame inset ~36.
  // Logo badge top-right around (520, 700)
  // Circle at (520,705) r=28 via Bezier (PDF has no arc operator)
  const graphics = [
    // Outer frame
    "2 w",
    "36 36 540 720 re S",
    // Inner frame
    "0.75 w",
    "48 48 516 696 re S",
    // Accent line under header
    "1.5 w",
    "72 640 m 540 640 l S",
    // Logo circle top-right
    "1.25 w",
    "548 705 m",
    "548 720.46 534.46 734 520 734 c",
    "505.54 734 492 720.46 492 705 c",
    "492 689.54 505.54 676 520 676 c",
    "534.46 676 548 689.54 548 705 c",
    "S",
    // Cat ears
    "505 715 m 512 732 l 519 715 l S",
    "521 715 m 528 732 l 535 715 l S",
    // Eyes (small dashes)
    "2 w",
    "508 708 m 514 708 l S",
    "526 708 m 532 708 l S",
    // Frown
    "1.25 w",
    "510 696 m 520 690 530 696 c S",
  ].join("\n");

  const textOps: string[] = [];
  const addText = (
    str: string,
    x: number,
    y: number,
    size: number,
    center = false
  ) => {
    const s = escapePdf(str);
    if (center) {
      // approximate center with width estimate 0.5*size*len
      const approx = str.length * size * 0.45;
      const cx = x - approx / 2;
      textOps.push(`BT /F1 ${size} Tf ${cx.toFixed(1)} ${y} Td (${s}) Tj ET`);
    } else {
      textOps.push(`BT /F1 ${size} Tf ${x} ${y} Td (${s}) Tj ET`);
    }
  };

  addText("MILLION ANGRY CATS", 306, 700, 11, true);
  addText("CERTIFICATE OF TRUCE", 306, 672, 22, true);
  addText("This certifies that a formal bribe was accepted", 306, 615, 11, true);
  addText("and a probationary ceasefire is hereby declared.", 306, 598, 11, true);

  addText("IN HONOR OF", 306, 555, 10, true);
  addText(label, 306, 525, 24, true);

  addText(`Serial No.  #${r.id}`, 90, 470, 12, false);
  addText(`Coordinates  ${coords}`, 90, 448, 12, false);
  addText(`Date of truce  ${when}`, 90, 426, 12, false);
  addText("Consideration  USD 0.99 (or package total)", 90, 404, 12, false);
  addText("Status  CEASEFIRE — probationary", 90, 382, 12, false);

  addText(
    "Valid for bragging rights worldwide. The cat may still ignore you in person.",
    306,
    320,
    10,
    true
  );
  addText(
    "Part 2: your cats may check in. Care system in the works.",
    306,
    300,
    9,
    true
  );

  // Signature lines
  textOps.push("1 w");
  // drawn as graphics in stream instead
  const sigGraphics = ["0.8 w", "90 180 m 250 180 l S", "360 180 m 520 180 l S"].join(
    "\n"
  );
  addText("Authorized briber", 90, 160, 9, false);
  addText("Office of Feline Diplomacy", 360, 160, 9, false);
  addText(SITE.replace("https://", ""), 306, 100, 10, true);
  addText("Not a legal instrument. Extremely official vibes only.", 306, 80, 8, true);

  // Logo label under circle
  addText("ANGRY", 520, 668, 7, true);
  addText("CATS", 520, 658, 7, true);

  const stream = [graphics, sigGraphics, ...textOps].join("\n");

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
  a.download = `truce-certificate-cat-${r.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function nativeShare(r: CatReceipt): Promise<boolean> {
  const text = receiptShareText(r);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "Million Angry Cats — Truce Certificate",
        text,
        url: SITE,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
