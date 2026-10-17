import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { compareDeliverableVersions } from "@/lib/collaboration/service";

export async function GET(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const v1 = searchParams.get("v1");
  const v2 = searchParams.get("v2");

  if (!v1 || !v2) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Both 'v1' and 'v2' version query parameters are required for comparison.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const comparison = await compareDeliverableVersions(user.id, v1, v2);
    return NextResponse.json({ data: comparison });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to compare versions.";
    return NextResponse.json(
      { error: { code: "COMPARISON_FAILED", message } },
      { status: 400 }
    );
  }
}
