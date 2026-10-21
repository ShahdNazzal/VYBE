// 1) Materialize assignments.json into per-item w_<key>.json files.
// 2) Print the keys whose caption was a weak fallback for precise re-fetching.
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const OUT = "/home/z/my-project/assets/imgsearch";
const assignments = JSON.parse(readFileSync(path.join(OUT, "assignments.json"), "utf-8"));

const weak = [];
for (const [key, value] of Object.entries(assignments)) {
  const file = path.join(OUT, `${key}.json`);
  if (existsSync(file)) { console.log(`skip ${key}`); continue; }
  writeFileSync(file, JSON.stringify({ success: true, results: [{ original_url: value.url }] }, null, 2));
  if (!value.matched) weak.push(key);
  console.log(`wrote ${key}`);
}
console.log("WEAK:", weak.join(","));
