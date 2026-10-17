import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export async function POST() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const updatedCount = await markAllNotificationsRead(user.id);
    return NextResponse.json({ data: { updatedCount } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to mark notifications read.";
    return NextResponse.json(
      { error: { code: "UPDATE_NOTIFICATIONS_FAILED", message } },
      { status: 500 }
    );
  }
}
