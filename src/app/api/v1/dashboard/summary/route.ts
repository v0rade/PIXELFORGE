import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/projects/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const summary = await getDashboardSummary(user.id);
    return NextResponse.json({ data: summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard summary.";
    return NextResponse.json(
      {
        error: {
          code: "DASHBOARD_SUMMARY_FAILED",
          message,
        },
      },
      { status: 500 }
    );
  }
}
