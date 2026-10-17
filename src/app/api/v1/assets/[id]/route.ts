import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { updateAssetSchema } from "@/lib/validation/assets";
import { deleteAsset, getAssetById, updateAsset } from "@/lib/assets/service";

export async function GET(
  _request: NextRequest,
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
  const asset = await getAssetById(user.id, id);

  if (!asset) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Asset not found or access denied." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { asset } });
}

export async function PATCH(
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
    const parsed = updateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid asset update payload.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateAsset(user.id, id, parsed.data);
    return NextResponse.json({ data: { asset: updated } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update asset.";
    const isUnauthorized = message.toLowerCase().includes("unauthorized");
    return NextResponse.json(
      {
        error: {
          code: isUnauthorized ? "FORBIDDEN" : "UPDATE_FAILED",
          message,
        },
      },
      { status: isUnauthorized ? 403 : 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const success = await deleteAsset(user.id, id);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Asset not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete asset.";
    const isUnauthorized = message.toLowerCase().includes("unauthorized");
    return NextResponse.json(
      {
        error: {
          code: isUnauthorized ? "FORBIDDEN" : "DELETE_FAILED",
          message,
        },
      },
      { status: isUnauthorized ? 403 : 400 }
    );
  }
}
