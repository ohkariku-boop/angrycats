import type { CatReceipt } from "./receipts";

const SITE = "https://angrycats.vercel.app/";

/** Site favicon — single source of truth for certificate / share branding */
export function faviconUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}favicon.svg`;
}

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

async function loadFaviconJpeg(
  size = 128
): Promise<{ bytes: Uint8Array; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = faviconUrl();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("favicon load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const b64 = dataUrl.split(",")[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, w: size, h: size };
  } catch {
    return null;
  }
}

function buildPdf(
  r: CatReceipt,
  logo: { bytes: Uint8Array; w: number; h: number } | null
): Blob {
  const label = r.name?.trim() || `Cat #${r.id}`;
  const when = new Date(r.bribed_at).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const coords = `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;

  const graphics = [
    "2 w",
    "36 36 540 720 re S",
    "0.75 w",
    "48 48 516 696 re S",
    "1.5 w",
    "72 640 m 540 640 l S",
  ].join("\n");

  // Place favicon top-right inside frame (about 56pt square)
  const logoOps = logo
    ? ["q", "56 0 0 56 500 678 cm", "/Im1 Do", "Q"].join("\n")
    : "";

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

  const sigGraphics = ["0.8 w", "90 180 m 250 180 l S", "360 180 m 520 180 l S"].join(
    "\n"
  );
  addText("Authorized briber", 90, 160, 9, false);
  addText("Office of Feline Diplomacy", 360, 160, 9, false);
  addText(SITE.replace("https://", ""), 306, 100, 10, true);
  addText("Not a legal instrument. Extremely official vibes only.", 306, 80, 8, true);

  const stream = [graphics, logoOps, sigGraphics, ...textOps].join("\n");

  const objects: string[] = [];
  // 1 catalog, 2 pages, 3 page, 4 contents, 5 font, [6 image]
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
  );

  if (logo) {
    objects.push(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> >>\nendobj\n"
    );
  } else {
    objects.push(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    );
  }

  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  if (logo) {
    // JPEG image XObject — binary will be appended carefully
    objects.push(
      `6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`
    );
  }

  // Build PDF with binary-safe concatenation for image
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const pushStr = (s: string) => parts.push(encoder.encode(s));

  pushStr("%PDF-1.4\n");
  const offsets: number[] = [0];
  let pos = parts.reduce((n, p) => n + p.length, 0);

  const pushObj = (s: string) => {
    offsets.push(pos);
    const b = encoder.encode(s);
    parts.push(b);
    pos += b.length;
  };

  // objects 1-5 (and start of 6)
  for (let i = 0; i < objects.length; i++) {
    if (i === 5 && logo) {
      // object 6 header already in objects[5]
      offsets.push(pos);
      const header = encoder.encode(objects[i]);
      parts.push(header);
      pos += header.length;
      parts.push(logo.bytes);
      pos += logo.bytes.length;
      const end = encoder.encode("\nendstream\nendobj\n");
      parts.push(end);
      pos += end.length;
    } else {
      pushObj(objects[i]);
    }
  }

  const xrefStart = pos;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\n`;
  xref += `startxref\n${xrefStart}\n%%EOF`;
  pushStr(xref);

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

/** Certificate PDF using site favicon as the official mark (top right) */
export async function downloadReceiptPdf(r: CatReceipt): Promise<void> {
  const logo = await loadFaviconJpeg(128);
  const blob = buildPdf(r, logo);
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
