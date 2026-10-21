// Fetch category-level image pools with captions, then match each starter
// wardrobe item to the best-fitting image by caption keywords.
import { execFile } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const OUT = "/home/z/my-project/assets/imgsearch";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERIES = [
  ["pool_tops", "white cotton t-shirt and white silk blouse folded, product photography, plain background", 5],
  ["pool_dresses", "little black dress and black pleated skirt, elegant product photography", 5],
  ["pool_denim", "blue denim jeans and navy chinos trousers folded, product photography", 5],
  ["pool_outerwear", "black wool blazer, beige trench coat, leather jacket on hangers, product photography", 5],
  ["pool_shoes", "white leather sneakers, black heels, brown ankle boots, product photography", 5],
  ["pool_accessories", "tan leather handbag, sunglasses, cashmere scarf, gold hoop earrings, product photography", 5],
];

function runOne([name, query, count], attempt = 0) {
  return new Promise((resolve) => {
    const args = ["image-search", "-q", query, "--count", String(count), "--gl", "us"];
    execFile("z-ai", args, { timeout: 240_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      const output = err ? String(err.message) : stdout;
      if (/429|too many requests/i.test(output) && attempt < 3) {
        console.log(`429 on ${name}, backing off 60s (attempt ${attempt + 1})`);
        sleep(60_000).then(() => runOne([name, query, count], attempt + 1).then(resolve));
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

for (const q of QUERIES) {
  if (existsSync(path.join(OUT, `${q[0]}.json`))) { console.log(`skip ${q[0]}`); continue; }
  await runOne(q);
  await sleep(6_000);
}

/* ---------------- caption-based matching ---------------- */

const ITEM_MATCHERS = [
  { key: "w_white_tee", pool: "pool_tops", words: ["t-shirt", "tee", "tshirt"] },
  { key: "w_white_shirt", pool: "pool_tops", words: ["button", "shirt", "poplin"] },
  { key: "w_silk_blouse", pool: "pool_tops", words: ["blouse", "silk", "champagne"] },
  { key: "w_knit_sweater", pool: "pool_tops", words: ["sweater", "knit", "cashmere"] },
  { key: "w_lbd", pool: "pool_dresses", words: ["dress"] },
  { key: "w_mini_skirt", pool: "pool_dresses", words: ["skirt", "pleated"] },
  { key: "w_denim_jeans", pool: "pool_denim", words: ["jeans", "denim"] },
  { key: "w_navy_chinos", pool: "pool_denim", words: ["chino", "navy", "trouser", "pant"] },
  { key: "w_black_blazer", pool: "pool_outerwear", words: ["blazer"] },
  { key: "w_trench", pool: "pool_outerwear", words: ["trench"] },
  { key: "w_biker_jacket", pool: "pool_outerwear", words: ["leather", "biker", "jacket"] },
  { key: "w_burgundy_cardigan", pool: "pool_outerwear", words: ["cardigan", "knit", "coat"] },
  { key: "w_denim_jacket", pool: "pool_outerwear", words: ["denim", "jacket", "jacket"] },
  { key: "w_sneakers", pool: "pool_shoes", words: ["sneaker", "trainer"] },
  { key: "w_heels", pool: "pool_shoes", words: ["heel", "pump"] },
  { key: "w_ankle_boots", pool: "pool_shoes", words: ["boot"] },
  { key: "w_handbag", pool: "pool_accessories", words: ["bag", "handbag", "tote"] },
  { key: "w_sunglasses", pool: "pool_accessories", words: ["sunglass", "glasses"] },
  { key: "w_scarf", pool: "pool_accessories", words: ["scarf"] },
  { key: "w_gold_earrings", pool: "pool_accessories", words: ["earring", "jewel", "gold"] },
];

const usedUrls = new Set();
const assignments = {};

for (const matcher of ITEM_MATCHERS) {
  const poolFile = path.join(OUT, `${matcher.pool}.json`);
  if (!existsSync(poolFile)) continue;
  const pool = JSON.parse(readFileSync(poolFile, "utf-8"));
  let best = null;
  let bestScore = 0;
  for (const result of pool.results) {
    if (usedUrls.has(result.original_url)) continue;
    const caption = (result.caption || "").toLowerCase();
    const score = matcher.words.reduce((acc, word) => acc + (caption.includes(word) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = result; }
  }
  // Fallback: first unused image in the pool (images are at least on-topic).
  if (!best) best = pool.results.find((r) => !usedUrls.has(r.original_url));
  if (best) {
    usedUrls.add(best.original_url);
    assignments[matcher.key] = {
      url: best.original_url,
      caption: best.caption || "",
      matched: bestScore > 0,
    };
    console.log(`${matcher.key}: ${bestScore > 0 ? "MATCH" : "FALLBACK"} — ${(best.caption || "").slice(0, 70)}`);
  }
}

writeFileSync(path.join(OUT, "assignments.json"), JSON.stringify(assignments, null, 2));
console.log(`ASSIGNED ${Object.keys(assignments).length}/${ITEM_MATCHERS.length}`);
