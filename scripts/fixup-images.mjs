// Precise re-fetch for weak fallback items — single-item queries, saved as
// w_<key>.json (which the sample-wardrobe API reads first).
import { execFile } from "child_process";
import { writeFileSync, existsSync } from "fs";
import path from "path";

const OUT = "/home/z/my-project/assets/imgsearch";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIXUPS = [
  ["w_silk_blouse", "elegant champagne silk blouse on hanger, product photography, plain background"],
  ["w_knit_sweater", "cream cashmere knit sweater folded, product photography, plain background"],
  ["w_denim_jeans", "blue denim jeans folded flat lay, product photography"],
  ["w_black_blazer", "black tailored blazer on hanger, product photography, plain background"],
  ["w_denim_jacket", "blue denim jacket on hanger, product photography, plain background"],
  ["w_sunglasses", "black cat eye sunglasses product photo, plain background"],
  ["w_scarf", "grey wool scarf folded, product photography, plain background"],
  ["w_gold_earrings", "small gold hoop earrings on white background, jewelry product photography"],
];

function runOne([name, query], attempt = 0) {
  return new Promise((resolve) => {
    if (existsSync(path.join(OUT, `${name}.json`))) { console.log(`skip ${name}`); resolve(); return; }
    const args = ["image-search", "-q", query, "--count", "3", "--gl", "us", "--no-rank"];
    execFile("z-ai", args, { timeout: 240_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      const output = err ? String(err.message) : stdout;
      if (/429|too many requests/i.test(output) && attempt < 4) {
        console.log(`429 on ${name}, backoff 50s (attempt ${attempt + 1})`);
        sleep(50_000).then(() => runOne([name, query], attempt + 1).then(resolve));
        return;
      }
      if (err) { console.error(`FAIL ${name}: ${err.message}`); resolve(); return; }
      const start = stdout.indexOf("{");
      const end = stdout.lastIndexOf("}");
      if (start === -1 || end <= start) { console.error(`FAIL ${name}: no JSON`); resolve(); return; }
      try {
        const data = JSON.parse(stdout.slice(start, end + 1));
        if (data.success && data.results?.length) {
          writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 2));
          console.log(`OK ${name} (${data.results.length})`);
        } else console.error(`FAIL ${name}: no results`);
      } catch (e) { console.error(`FAIL ${name}: ${e.message}`); }
      resolve();
    });
  });
}

for (const fix of FIXUPS) {
  await runOne(fix);
  await sleep(5_000);
}
console.log("FIXUPS_DONE");
