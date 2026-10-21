// Fetches wardrobe/editorial images via `z-ai image-search` and saves parsed
// JSON results to assets/imgsearch/<name>.json  (the CLI's -o flag is broken,
// so we parse stdout ourselves).
import { execFile } from "child_process";
import { writeFileSync, existsSync } from "fs";
import path from "path";

const OUT = "/home/z/my-project/assets/imgsearch";

const TASKS = [
  ["editorial_hero", "elegant fashion editorial photo woman in burgundy coat, vogue magazine style", 3],
  ["editorial_wardrobe", "minimalist walk-in closet with elegant clothes hanging on wooden rail, warm tones", 3],
  ["editorial_flatlay", "flat lay of fashionable clothing and accessories on cream background, editorial style", 3],
  ["editorial_studio", "stylish woman choosing outfit in front of mirror, chic apartment, editorial photography", 3],
  ["w_white_tee", "white cotton t-shirt product photo on plain background", 2],
  ["w_white_shirt", "crisp white button-down shirt product photo plain background", 2],
  ["w_black_blazer", "black tailored blazer product photo plain background", 2],
  ["w_denim_jeans", "blue straight leg denim jeans product photo plain background", 2],
  ["w_lbd", "little black dress elegant product photo plain background", 2],
  ["w_trench", "beige trench coat product photo plain background", 2],
  ["w_sneakers", "white leather sneakers product photo plain background", 2],
  ["w_heels", "black classic high heels pumps product photo plain background", 2],
  ["w_biker_jacket", "black leather biker jacket product photo plain background", 2],
  ["w_knit_sweater", "cream cashmere knit sweater folded product photo plain background", 2],
  ["w_navy_chinos", "navy blue chino trousers product photo plain background", 2],
  ["w_silk_blouse", "champagne silk blouse product photo plain background", 2],
  ["w_mini_skirt", "black pleated mini skirt product photo plain background", 2],
  ["w_ankle_boots", "brown leather ankle boots product photo plain background", 2],
  ["w_scarf", "grey cashmere scarf folded product photo plain background", 2],
  ["w_handbag", "tan leather handbag product photo plain background", 2],
  ["w_sunglasses", "black designer sunglasses product photo plain background", 2],
  ["w_burgundy_cardigan", "burgundy knit cardigan product photo plain background", 2],
  ["w_gold_earrings", "small gold hoop earrings jewelry product photo plain background", 2],
  ["w_denim_jacket", "light blue denim jacket product photo plain background", 2],
];

function runOne([name, query, count]) {
  return new Promise((resolve) => {
    if (existsSync(path.join(OUT, `${name}.json`))) {
      console.log(`skip (exists): ${name}`);
      resolve();
      return;
    }
    const args = [
      "image-search",
      "-q", query,
      "--count", String(count),
      "--gl", "us",
      "--no-rank",
    ];
    execFile("z-ai", args, { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        console.error(`FAIL ${name}: ${err.message}`);
        resolve();
        return;
      }
      const start = stdout.indexOf("{");
      const end = stdout.lastIndexOf("}");
      if (start === -1 || end <= start) {
        console.error(`FAIL ${name}: no JSON in output`);
        resolve();
        return;
      }
      try {
        const data = JSON.parse(stdout.slice(start, end + 1));
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 2));
          console.log(`OK ${name} (${data.results.length} images)`);
        } else {
          console.error(`FAIL ${name}: success=${data.success} results=${data.results?.length}`);
        }
      } catch (e) {
        console.error(`FAIL ${name}: bad JSON — ${e.message}`);
      }
      resolve();
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runOne([name, query, count], attempt = 0) {
  return new Promise(async (resolve) => {
    if (existsSync(path.join(OUT, `${name}.json`))) {
      console.log(`skip (exists): ${name}`);
      resolve();
      return;
    }
    const args = ["image-search", "-q", query, "--count", String(count), "--gl", "us", "--no-rank"];
    execFile("z-ai", args, { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }, async (err, stdout) => {
      const output = err ? `${err.message}` : stdout;
      if (output.includes("429") || output.toLowerCase().includes("too many requests")) {
        if (attempt < 4) {
          console.log(`429 ${name} — backing off 45s (attempt ${attempt + 1})`);
          await sleep(45_000);
          resolve(await runOne([name, query, count], attempt + 1));
          return;
        }
      }
      if (err) {
        console.error(`FAIL ${name}: ${err.message}`);
        resolve();
        return;
      }
      const start = stdout.indexOf("{");
      const end = stdout.lastIndexOf("}");
      if (start === -1 || end <= start) {
        console.error(`FAIL ${name}: no JSON in output`);
        resolve();
        return;
      }
      try {
        const data = JSON.parse(stdout.slice(start, end + 1));
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data, null, 2));
          console.log(`OK ${name} (${data.results.length} images)`);
        } else {
          console.error(`FAIL ${name}: success=${data.success} results=${data.results?.length}`);
        }
      } catch (e) {
        console.error(`FAIL ${name}: bad JSON — ${e.message}`);
      }
      resolve();
    });
  });
}

// Sequential with breathing room to respect the rate limit.
for (const task of TASKS) {
  await runOne(task);
  await sleep(4_000);
}
console.log("ALL_DONE");
