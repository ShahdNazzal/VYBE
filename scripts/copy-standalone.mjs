// Copies static assets into the standalone build output (self-hosting only).
// Cross-platform replacement for `cp -r` (works on Windows / macOS / Linux).
// On hosts without a standalone output (e.g. Vercel) this is a no-op.
import { cpSync, existsSync } from "node:fs";

if (!existsSync(".next/standalone")) {
  console.log("- No standalone output (skipping asset copy)");
} else {
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
  console.log("✓ Standalone assets copied (static + public)");
}
