import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createClientSchema } from "@/lib/validation/collaboration";
import { createClient, listClients } from "@/lib/collaboration/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const clients = await listClients(user.id);
    return NextResponse.json({ data: { clients } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load clients.";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid client payload.",
          },
        },
        { status: 400 }
      );
    }

    const client = await createClient(user.id, parsed.data);
    return NextResponse.json({ data: { client } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create client.";
    return NextResponse.json(
      { error: { code: "CREATE_CLIENT_FAILED", message } },
      { status: 400 }
    );
  }
}
