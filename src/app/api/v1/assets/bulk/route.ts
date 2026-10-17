import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { bulkAssetActionSchema } from "@/lib/validation/assets";
import { bulkAssetAction } from "@/lib/assets/service";

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
    const parsed = bulkAssetActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid bulk action request.",
          },
        },
        { status: 400 }
      );
    }

    const result = await bulkAssetAction(user.id, parsed.data);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute bulk action.";
    return NextResponse.json(
      { error: { code: "BULK_ACTION_FAILED", message } },
      { status: 400 }
    );
  }
}
