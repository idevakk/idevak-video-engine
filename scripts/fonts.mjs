// Download Google Fonts woff2 subsets locally and rewrite the CSS to local paths.
import fs from "node:fs/promises";
import path from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const targets = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap",
];

const outDir = "assets/fonts";
await fs.mkdir(outDir, { recursive: true });

let css = "";
for (const url of targets) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  css += (await res.text()) + "\n";
}

const blocks = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
const keep = [];
let i = 0;
for (const block of blocks) {
  const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
  if (!rangeMatch) continue;
  const range = rangeMatch[1];
  // latin + latin-ext only
  const isLatin = range.includes("U+0000-00FF") || range.includes("U+0100-02BA");
  if (!isLatin) continue;
  const src = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
  if (!src) continue;
  const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1] || "font";
  const slug = family.toLowerCase().replace(/\s+/g, "-");
  const file = `${slug}-${i++}.woff2`;
  const bin = Buffer.from(await (await fetch(src[1], { headers: { "User-Agent": UA } })).arrayBuffer());
  await fs.writeFile(path.join(outDir, file), bin);
  keep.push(block.replace(src[1], `fonts/${file}`));
  console.log(file, family, bin.length, range.slice(0, 80));
}

await fs.writeFile("build/fonts.local.css", keep.join("\n\n"), "utf8");
