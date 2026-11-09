import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "demo");
mkdirSync(dir, { recursive: true });

const funscript = {
  version: "1.0",
  inverted: false,
  range: 100,
  actions: Array.from({ length: 120 }, (_, i) => ({
    at: i * 500,
    pos: Math.round(50 + 45 * Math.sin((i / 5) * Math.PI)),
  })),
  metadata: {
    title: "Midnight Velvet — Demo Funscript",
    creator: "JERRYHUB",
    duration: 60000,
    notes: "Demo file. Sync with your favourite player.",
  },
};
writeFileSync(join(dir, "midnight-velvet.funscript"), JSON.stringify(funscript, null, 2));

function escapePdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf() {
  const pages = [
    {
      title: "Crimson Letters",
      subtitle: "An interactive story — Chapter One",
      lines: [
        "The rain had not stopped for three days.",
        "She found the letter tucked beneath the door of the",
        "studio: thick cream paper, no return address, and a",
        "single line of red ink that made her pulse skip.",
        "",
        "\"I saw you through the window. You were perfect.\"",
        "",
        "Outside, the city glowed in shades of neon and smoke.",
        "She read the line again, then a third time, and felt",
        "the strange warmth of being watched.",
      ],
    },
    {
      title: "Chapter Two",
      subtitle: "The invitation",
      lines: [
        "The address led to a members-only lounge on the",
        "twelfth floor. Velvet walls. Low light. A woman in",
        "a black dress who knew her name before she said it.",
        "",
        "\"You came,\" she said. \"I hoped you would.\"",
        "",
        "Every door in the room was closed. Every eye was on",
        "her. She should have turned around. She didn't.",
      ],
    },
    {
      title: "Chapter Three",
      subtitle: "To be continued for members",
      lines: [
        "This is a demo document included with the local",
        "preview build of JERRYHUB.",
        "",
        "In production, stories are uploaded as private PDFs",
        "and served through short-lived signed URLs after your",
        "Patreon membership is verified.",
        "",
        "Unlock the full library at jerryhub.app",
      ],
    },
  ];

  const objects = [];
  const add = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];
  const contentIds = [];

  for (const page of pages) {
    const body = [];
    body.push("0.04 0.04 0.05 rg");
    body.push("0 0 612 792 re f");
    body.push("0.98 0.18 0.47 rg");
    body.push("56 700 40 3 re f");
    body.push("1 1 1 rg");
    body.push(`BT /F2 30 Tf 56 640 Td (${escapePdf(page.title)}) Tj ET`);
    body.push("0.65 0.65 0.72 rg");
    body.push(`BT /F1 12 Tf 56 614 Td (${escapePdf(page.subtitle)}) Tj ET`);
    body.push("0.92 0.92 0.95 rg");
    let y = 550;
    for (const line of page.lines) {
      if (line) body.push(`BT /F1 13 Tf 56 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 26;
    }
    body.push("0.45 0.45 0.52 rg");
    body.push("BT /F1 9 Tf 56 70 Td (JERRYHUB  /  MEMBERS ONLY  /  DEMO DOCUMENT) Tj ET");
    const stream = body.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    contentIds.push(contentId);
  }

  const pagesId = objects.length + 1 + pages.length * 1; // placeholder, recomputed below
  // Allocate page objects first so we know their ids.
  const allocatedPageIds = pages.map(() => add("PLACEHOLDER"));
  for (let i = 0; i < pages.length; i++) {
    objects[allocatedPageIds[i] - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    pageIds.push(allocatedPageIds[i]);
  }
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

writeFileSync(join(dir, "crimson-letters.pdf"), buildPdf());
console.log("Demo assets written");
