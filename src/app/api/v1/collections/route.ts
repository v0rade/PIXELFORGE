import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createCollectionSchema } from "@/lib/validation/assets";
import { createCollection, listCollections } from "@/lib/assets/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const collections = await listCollections(user.id);
    return NextResponse.json({ data: { collections } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load collections.";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createCollectionSchema.safeParse(body);

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

    const created = await createCollection(user.id, parsed.data);
    return NextResponse.json({ data: { collection: created } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create collection.";
    return NextResponse.json(
      { error: { code: "CREATE_COLLECTION_FAILED", message } },
      { status: 400 }
    );
  }
}
