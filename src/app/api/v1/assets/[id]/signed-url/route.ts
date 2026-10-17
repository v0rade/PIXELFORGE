import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { generateSignedUrl } from "@/lib/assets/service";

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

  const { id } = await params;

  try {
    let expiresIn = 900; // default 15 minutes
    try {
      const body = await request.json();
      if (typeof body.expiresIn === "number" && body.expiresIn > 0) {
        expiresIn = Math.min(body.expiresIn, 86400); // capped at 24h
      }
    } catch {
      // Body is optional
    }

    const result = await generateSignedUrl(user.id, id, expiresIn);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate signed URL.";
    return NextResponse.json(
      { error: { code: "SIGNED_URL_FAILED", message } },
      { status: 400 }
    );
  }
}
