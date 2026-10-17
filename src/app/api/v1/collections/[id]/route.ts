import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { updateCollectionSchema } from "@/lib/validation/assets";
import {
  deleteCollection,
  getCollectionById,
  updateCollection,
} from "@/lib/assets/service";

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
  const collection = await getCollectionById(user.id, id);

  if (!collection) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Collection not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { collection } });
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
    const parsed = updateCollectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid collection payload.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateCollection(user.id, id, parsed.data);
    return NextResponse.json({ data: { collection: updated } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update collection.";
    return NextResponse.json(
      { error: { code: "UPDATE_COLLECTION_FAILED", message } },
      { status: 400 }
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
    const success = await deleteCollection(user.id, id);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Collection not found." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete collection.";
    return NextResponse.json(
      { error: { code: "DELETE_COLLECTION_FAILED", message } },
      { status: 400 }
    );
  }
}
