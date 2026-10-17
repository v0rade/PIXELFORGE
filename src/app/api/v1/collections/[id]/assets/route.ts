import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { collectionAssetSchema } from "@/lib/validation/assets";
import {
  addAssetToCollection,
  removeAssetFromCollection,
} from "@/lib/assets/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = collectionAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid payload.",
          },
        },
        { status: 400 }
      );
    }

    await addAssetToCollection(user.id, id, parsed.data.assetId);
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add asset to collection.";
    return NextResponse.json(
      { error: { code: "ADD_ASSET_FAILED", message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = collectionAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid payload.",
          },
        },
        { status: 400 }
      );
    }

    await removeAssetFromCollection(user.id, id, parsed.data.assetId);
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove asset from collection.";
    return NextResponse.json(
      { error: { code: "REMOVE_ASSET_FAILED", message } },
      { status: 400 }
    );
  }
}
