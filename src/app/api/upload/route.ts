import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { putObject } from "@/lib/storage";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const form = await req.formData().catch(() => null);
    if (!form) return jsonError("Expected multipart form data.", 400);

    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Please attach an image file.", 400);
    if (file.size === 0) return jsonError("The selected file is empty.", 400);
    if (file.size > MAX_BYTES) return jsonError("Image is too large — please keep it under 8 MB.", 413);

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return jsonError("Unsupported image format. Use JPG, PNG, WebP or GIF.", 415);

    const bytes = Buffer.from(await file.arrayBuffer());

    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    // Dual-mode: Supabase Storage when configured, local ./uploads otherwise.
    await putObject(`${user.id}/${filename}`, bytes, file.type);

    const url = `/api/uploads/${user.id}/${filename}`;
    return NextResponse.json({ url, filename }, { status: 201 });
  });
}
