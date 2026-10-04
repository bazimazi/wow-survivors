import { mkdir, writeFile } from "node:fs/promises";

const response = await fetch(
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400..700&family=DM+Sans:wght@400..700&display=swap",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  },
);
if (!response.ok)
  throw new Error(`Font stylesheet request failed: ${response.status}`);
const css = await response.text();
const latinFaces = [
  ...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g),
].map((m) => m[1]);
const faces = latinFaces.length
  ? latinFaces
  : [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map((m) => m[0]);
if (!faces.length) throw new Error("No font faces returned.");
await mkdir("public/fonts", { recursive: true });
const local = [];
for (const face of faces) {
  const family = /font-family:\s*'([^']+)'/.exec(face)?.[1];
  const url = /url\((https:[^)]+)\)/.exec(face)?.[1];
  if (!family || !url) throw new Error("Incomplete font face.");
  const weight = /font-weight:\s*([^;]+);/.exec(face)?.[1].replaceAll(" ", "-");
  const extension = url.includes(".ttf") ? "ttf" : "woff2";
  const name = `${family.toLowerCase().replaceAll(" ", "-")}-${weight}-latin.${extension}`;
  const font = await fetch(url);
  if (!font.ok) throw new Error(`Font download failed: ${font.status}`);
  await writeFile(
    `public/fonts/${name}`,
    Buffer.from(await font.arrayBuffer()),
  );
  local.push(face.replace(url, `/fonts/${name}`));
  console.log(`Downloaded ${name}`);
}
await writeFile("src/fonts.css", local.join("\n\n") + "\n");
