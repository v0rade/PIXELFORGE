import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { updateInquiryStatusSchema } from "@/lib/validation/contact";
import { updateContactInquiryStatus } from "@/lib/contact/service";

export async function PATCH(
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

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateInquiryStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message || "Invalid status update payload.",
          },
        },
        { status: 400 }
      );
    }

    const success = await updateContactInquiryStatus(
      user.id,
      id,
      parsed.data.status
    );

    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Inquiry not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update inquiry status.";
    return NextResponse.json(
      { error: { code: "UPDATE_INQUIRY_FAILED", message } },
      { status: 500 }
    );
  }
}
