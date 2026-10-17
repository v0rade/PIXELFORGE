import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { deleteClient } from "@/lib/collaboration/service";

export async function DELETE(
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
    const success = await deleteClient(user.id, id);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Client record not found." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete client.";
    return NextResponse.json(
      { error: { code: "DELETE_CLIENT_FAILED", message } },
      { status: 400 }
    );
  }
}
