import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HOMESTEAD_DIR = path.join(ROOT, "images", "Qwalela Homestead");
const MANIFEST = path.join(HOMESTEAD_DIR, "gallery.json");
const WEB = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const HEIC = new Set([".heic", ".heif"]);

const SHRINK = path.join(ROOT, "scripts", "shrink-image.py");

function shrinkJpeg(file) {
  execFileSync("python3", [SHRINK, file, file, "1920"], { stdio: "pipe" });
}

function slugBase(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "photo";
}

export function ingestQwalela() {
  fs.mkdirSync(HOMESTEAD_DIR, { recursive: true });
  const names = fs.readdirSync(HOMESTEAD_DIR);
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    if (!HEIC.has(ext)) continue;
    const src = path.join(HOMESTEAD_DIR, name);
    const dest = path.join(HOMESTEAD_DIR, `${slugBase(name)}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
      continue;
    }
    try {
      execFileSync("heif-convert", ["-q", "88", src, dest], { stdio: "pipe" });
      shrinkJpeg(dest);
      console.log(`Converted ${name} → ${path.basename(dest)}`);
    } catch (err) {
      console.error(`Could not convert ${name}:`, err.stderr?.toString() || err.message);
    }
  }

  const images = fs
    .readdirSync(HOMESTEAD_DIR)
    .filter((name) => WEB.has(path.extname(name).toLowerCase()))
    .filter((name) => name !== "11.jpg" && name !== "20.jpg")
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((name) => `images/Qwalela Homestead/${name}`);

  let hero = images[0] || "";
  try {
    const prevData = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    if (prevData.hero && images.includes(prevData.hero)) hero = prevData.hero;
  } catch {
    /* first write */
  }
  if (images.includes("images/Qwalela Homestead/10.jpg")) {
    hero = "images/Qwalela Homestead/10.jpg";
  }
  const payload = `${JSON.stringify({ hero, images }, null, 2)}\n`;
  const prev = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, "utf8") : "";
  if (prev !== payload) fs.writeFileSync(MANIFEST, payload);
  return images;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const images = ingestQwalela();
  console.log(`${images.length} web image(s) in Qwalela Homestead`);
}
