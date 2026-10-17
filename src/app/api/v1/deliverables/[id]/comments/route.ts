import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createRevisionCommentSchema } from "@/lib/validation/collaboration";
import { addRevisionComment } from "@/lib/collaboration/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id: deliverableId } = await params;

  try {
    const body = await request.json();
    const parsed = createRevisionCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message || "Invalid revision comment.",
          },
        },
        { status: 400 }
      );
    }

    const comment = await addRevisionComment(
      user.id,
      deliverableId,
      parsed.data
    );

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to post comment.";
    const isSelfApprovalForbidden = message.includes("cannot approve your own");
    return NextResponse.json(
      {
        error: {
          code: isSelfApprovalForbidden
            ? "SELF_APPROVAL_FORBIDDEN"
            : "COMMENT_CREATION_FAILED",
          message,
        },
      },
      { status: isSelfApprovalForbidden ? 403 : 400 }
    );
  }
}
