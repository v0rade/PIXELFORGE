import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { toggleArchiveProject } from "@/lib/projects/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  try {
    const updated = await toggleArchiveProject(user.id, id);
    return NextResponse.json({
      data: {
        project: updated,
        isArchived: updated.status === "archived",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle archive status.";
    return NextResponse.json(
      {
        error: {
          code: "ARCHIVE_FAILED",
          message,
        },
      },
      { status: 400 }
    );
  }
}
