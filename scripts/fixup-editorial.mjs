// Refetch the two secondary editorial images with captions, picking the best
// candidate by caption keywords while skipping stock-site watermarks.
import { execFile } from "child_process";
import { writeFileSync } from "fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const JOBS = [
  {
    name: "editorial_wardrobe",
    query: "minimal capsule wardrobe with neutral clothes hanging on wooden rail, bright interior, unsplash style photo",
    keywords: ["rail", "rack", "hanging", "closet", "wardrobe", "clothes", "garment"],
    avoid: ["shutterstock", "vector", "illustration", "mockup", "template"],
  },
  {
    name: "editorial_studio",
    query: "elegant woman looking at her outfit in a full length mirror, dressing room, fashion editorial",
    keywords: ["mirror", "dressing", "outfit", "trying", "fitting", "reflection"],
    avoid: ["shutterstock", "vector", "illustration", "mockup", "template"],
  },
];

for (const job of JOBS) {
  const url = await new Promise((resolve) => {
    execFile("z-ai", ["image-search", "-q", job.query, "--count", "6", "--gl", "us"], { timeout: 220_000, maxBuffer: 10e6 }, (err, stdout) => {
      if (err) { console.error("FAIL", job.name, err.message); resolve(null); return; }
      const s = stdout.indexOf("{"), e = stdout.lastIndexOf("}");
      try {
        const data = JSON.parse(stdout.slice(s, e + 1));
        const results = data?.results ?? [];
        const scored = results
          .filter((r) => !job.avoid.some((a) => `${r.caption} ${r.source}`.toLowerCase().includes(a)))
          .map((r) => ({
            r,
            score: job.keywords.reduce((acc, k) => acc + ((r.caption || "").toLowerCase().includes(k) ? 1 : 0), 0)
              + (r.source === "Unsplash" ? 1 : 0),
          }))
          .sort((a, b) => b.score - a.score);
        if (scored.length) {
          console.log(`OK ${job.name}: score=${scored[0].score} — ${scored[0].r.caption?.slice(0, 90)}`);
          resolve(scored[0].r.original_url);
        } else {
          console.error(`FAIL ${job.name}: no usable candidates`);
          resolve(null);
        }
      } catch (x) { console.error("FAIL", job.name, x.message); resolve(null); }
    });
  });
  if (url) {
    writeFileSync(`assets/imgsearch/${job.name}.json`, JSON.stringify({ success: true, results: [{ original_url: url }] }, null, 2));
  }
  await sleep(5_000);
}
console.log("EDITORIAL_FIX_DONE");
