import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { listActivityLogs } from "@/lib/activity/service";

export async function GET(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  try {
    const activities = await listActivityLogs(user.id, {
      eventType,
      projectId,
      limit,
    });

    return NextResponse.json({ data: { activities } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve activity log.";
    return NextResponse.json(
      { error: { code: "FETCH_ACTIVITY_FAILED", message } },
      { status: 500 }
    );
  }
}
