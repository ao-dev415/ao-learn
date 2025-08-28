import fs from "fs";
import path from "path";

const SITE = "site.json";
const MEDIA_ROOT = "media";

function isVideo(fn) { return /\.(mp4|webm|ogg)$/i.test(fn); }
function isImage(fn) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(fn); }

function loadSite() {
  const raw = fs.readFileSync(SITE, "utf8");
  return JSON.parse(raw);
}
function saveSite(obj) {
  fs.writeFileSync(SITE, JSON.stringify(obj, null, 2), "utf8");
}
function zero(n) { return String(n).padStart(2, "0"); }

function parseLoNumber(loTitle = "") {
  const m = loTitle.match(/(\d+)\.(\d+)/);
  if (!m) return null;
  return { ch: parseInt(m[1], 10), lo: parseInt(m[2], 10) };
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => isImage(f) || isVideo(f))
    .sort((a, b) => a.localeCompare(b))
    .map(f => {
      const rel = path.posix.join(dir, f).replace(/\\/g, "/");
      return isVideo(f) ? { type: "video", src: rel } : { src: rel };
    });
}

function updateImages(site) {
  for (const [ci, ch] of site.chapters.entries()) {
    for (const [li, lo] of (ch.los || []).entries()) {
      const num = parseLoNumber(lo.title);
      const chNum = num?.ch ?? (ci + 1);
      const loNum = num?.lo ?? (li + 1);

      const loDir = path.posix.join(
        MEDIA_ROOT,
        `ch${zero(chNum)}`,
        `lo${chNum}-${loNum}`
      );
      const files = collectFiles(loDir);
      if (files.length) {
        lo.images = files;
        if (!lo.preview && lo.snippets?.[0]?.body) {
          lo.preview = lo.snippets[0].body.slice(0, 140);
        }
        console.log(`Set images for ${lo.title} -> ${loDir} (${files.length})`);
      } else {
        console.log(`No media found for ${lo.title} (looked in ${loDir})`);
      }
    }
  }
}

function main() {
  if (!fs.existsSync(SITE)) {
    console.error(`Missing ${SITE}. Run the docx import first or create a minimal skeleton.`);
    process.exit(2);
  }
  const site = loadSite();
  updateImages(site);
  saveSite(site);
  console.log("Updated images in site.json from media/.");
}

main();
