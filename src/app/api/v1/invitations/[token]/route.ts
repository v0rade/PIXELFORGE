import { NextResponse, type NextRequest } from "next/server";
import { verifyInvitation } from "@/lib/collaboration/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "Malformed invitation token." } },
      { status: 400 }
    );
  }

  const result = await verifyInvitation(token);
  if (!result.valid || !result.invitation) {
    return NextResponse.json(
      { error: { code: "INVITATION_INVALID", message: result.reason || "Invitation invalid." } },
      { status: 400 }
    );
  }

  // Return public preview of invitation (safe info only)
  return NextResponse.json({
    data: {
      projectId: result.invitation.projectId,
      projectTitle: result.invitation.projectTitle || "Studio Project",
      email: result.invitation.email,
      role: result.invitation.role,
      expiresAt: result.invitation.expiresAt,
    },
  });
}
