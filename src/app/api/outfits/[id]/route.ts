import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const outfit = await db.outfit.findFirst({ where: { id, userId: user.id } });
    if (!outfit) return jsonError("Outfit not found.", 404);
    return NextResponse.json({ outfit });
  });
}

// PATCH — save/unsave an outfit to the lookbook
export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;

    const outfit = await db.outfit.findFirst({ where: { id, userId: user.id } });
    if (!outfit) return jsonError("Outfit not found.", 404);

    const body = await req.json().catch(() => ({}));
    const saved = typeof body?.saved === "boolean" ? body.saved : true;

    const updated = await db.outfit.update({ where: { id: outfit.id }, data: { saved } });
    return NextResponse.json({ outfit: updated });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;

    const outfit = await db.outfit.findFirst({ where: { id, userId: user.id } });
    if (!outfit) return jsonError("Outfit not found.", 404);

    await db.outfit.delete({ where: { id: outfit.id } });
    return NextResponse.json({ ok: true });
  });
}
