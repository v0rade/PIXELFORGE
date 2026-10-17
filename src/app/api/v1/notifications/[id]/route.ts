import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/lib/notifications/service";

export async function PATCH(
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
    const success = await markNotificationRead(user.id, id);
    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Notification not found or already marked as read.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to mark notification read.";
    return NextResponse.json(
      { error: { code: "UPDATE_NOTIFICATION_FAILED", message } },
      { status: 500 }
    );
  }
}
