#!/usr/bin/env node
/**
 * VYBE — Supabase Storage self-test (zero dependencies).
 * Usage:  node scripts/test-supabase-storage.mjs
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment or .env,
 * uploads a tiny PNG to the private "wardrobe" bucket and prints a signed URL.
 */
import { readFileSync } from "node:fs";

const env = {};
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*?)"?\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2];
  }
} catch {}

const URL_ = (process.env.SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env or environment)");
  process.exit(1);
}
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const key = `selftest/${Date.now()}.png`;

const up = await fetch(`${URL_}/storage/v1/object/wardrobe/${key}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "image/png", "x-upsert": "true" },
  body: new Uint8Array(PNG),
});
if (!up.ok) {
  if (up.status === 404) {
    console.log("bucket missing → creating 'wardrobe' ...");
    await fetch(`${URL_}/storage/v1/bucket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "wardrobe", public: false }),
    });
    const retry = await fetch(`${URL_}/storage/v1/object/wardrobe/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "image/png", "x-upsert": "true" },
      body: new Uint8Array(PNG),
    });
    if (!retry.ok) { console.error("upload failed:", retry.status, await retry.text()); process.exit(1); }
  } else { console.error("upload failed:", up.status, await up.text()); process.exit(1); }
}
const sign = await fetch(`${URL_}/storage/v1/object/sign/wardrobe/${key}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ expiresIn: 3600 }),
});
const { signedURL } = await sign.json();
console.log("\nSUCCESS ✓ Supabase Storage is working.");
console.log("Open this signed URL (valid 1 hour) to confirm:");
console.log(`${URL_}/storage/v1${signedURL}`);
