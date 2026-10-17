import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const result = await listNotifications(user.id);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load notifications.";
    return NextResponse.json(
      { error: { code: "FETCH_NOTIFICATIONS_FAILED", message } },
      { status: 500 }
    );
  }
}
