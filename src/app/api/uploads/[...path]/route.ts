import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { getSignedObjectUrl, isSupabaseStorage } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Serves uploaded wardrobe images. Requires a signed-in session — the browser
// automatically attaches the session cookie when loading <img> tags.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { path: segments } = await params;
  if (!segments || segments.length !== 2) {
    return new NextResponse("Not found", { status: 404 });
  }
  const [userId, filename] = segments;

  // Users can only read files from their own upload folder.
  if (userId !== user.id || filename.includes("..") || filename.includes("/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new NextResponse("Unsupported type", { status: 415 });

  // Supabase mode: redirect to a short-lived signed URL of the private object.
  if (isSupabaseStorage()) {
    const signed = await getSignedObjectUrl(`${userId}/${filename}`);
    if (!signed) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(signed, {
      status: 302,
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), "uploads", userId, filename));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
