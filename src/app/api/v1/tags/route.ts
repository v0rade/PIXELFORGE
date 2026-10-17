import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createTagSchema } from "@/lib/validation/assets";
import { createTag, listTags } from "@/lib/assets/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const tags = await listTags(user.id);
    return NextResponse.json({ data: { tags } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load tags.";
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
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid tag payload.",
          },
        },
        { status: 400 }
      );
    }

    const created = await createTag(user.id, parsed.data.name);
    return NextResponse.json({ data: { tag: created } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create tag.";
    return NextResponse.json(
      { error: { code: "CREATE_TAG_FAILED", message } },
      { status: 400 }
    );
  }
}
