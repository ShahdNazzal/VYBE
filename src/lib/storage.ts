/**
 * Dual-mode wardrobe image storage.
 *
 * - SUPABASE mode: active when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   (e.g. on Vercel). Images live in a private Supabase Storage bucket and are
 *   served through short-lived signed URLs. Zero dependencies — plain fetch.
 *
 * - LOCAL mode (default, exactly like the app always worked): images are files
 *   under ./uploads/<userId>/ and are streamed by /api/uploads/[...path].
 *
 * The database always stores the same relative path (`<userId>/<filename>`),
 * so switching modes never changes any stored data.
 */

const BUCKET = process.env.SUPABASE_BUCKET?.trim() || "wardrobe";

export function isSupabaseStorage(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function supabaseConfig(): { url: string; key: string } {
  return {
    url: (process.env.SUPABASE_URL?.trim() || "").replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  };
}

/* ------------------------------------------------------------------ */
/* Local disk mode                                                     */
/* ------------------------------------------------------------------ */

async function putLocal(key: string, bytes: Buffer): Promise<void> {
  const { mkdir, writeFile } = await import("fs/promises");
  const path = await import("path");
  const target = path.join(process.cwd(), "uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

/* ------------------------------------------------------------------ */
/* Supabase Storage mode                                               */
/* ------------------------------------------------------------------ */

async function ensureBucket(url: string, key: string): Promise<void> {
  await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: BUCKET, public: false }),
  }).catch(() => null); // 400 "already exists" is fine — bucket provisioning is idempotent
}

async function putSupabase(url: string, key: string, objectKey: string, bytes: Buffer, contentType: string): Promise<void> {
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // Auto-provision the bucket once, then retry the upload.
    if (response.status === 404 || detail.toLowerCase().includes("bucket")) {
      await ensureBucket(url, key);
      const retry = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectKey}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(bytes),
      });
      if (!retry.ok) {
        const retryDetail = await retry.text().catch(() => "");
        throw new Error(`Supabase upload failed (${retry.status}): ${retryDetail.slice(0, 200)}`);
      }
      return;
    }
    throw new Error(`Supabase upload failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

async function getSignedUrl(url: string, key: string, objectKey: string): Promise<string | null> {
  const response = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${objectKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as { signedURL?: string } | null;
  if (!data?.signedURL) return null;
  return `${url}/storage/v1${data.signedURL}`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Store an image under `<userId>/<filename>`. Throws on failure. */
export async function putObject(objectKey: string, bytes: Buffer, contentType: string): Promise<void> {
  if (isSupabaseStorage()) {
    const { url, key } = supabaseConfig();
    await putSupabase(url, key, objectKey, bytes, contentType);
    return;
  }
  await putLocal(objectKey, bytes);
}

/**
 * Supabase mode only: a short-lived signed URL for a private object
 * (used as a 302 redirect target). Returns null when unavailable.
 */
export async function getSignedObjectUrl(objectKey: string): Promise<string | null> {
  if (!isSupabaseStorage()) return null;
  const { url, key } = supabaseConfig();
  return getSignedUrl(url, key, objectKey);
}
