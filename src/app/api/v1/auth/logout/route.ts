import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);

  return NextResponse.json({
    data: {
      signedOut: true,
      redirectTo: "/login",
    },
  });
}
