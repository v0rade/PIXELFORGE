import { NextResponse, type NextRequest } from "next/server";
import { usernameSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { DEMO_DESIGNER_PROFILE } from "@/lib/demo/data";

/**
 * GET /api/v1/profile/public/[username]
 * Queries ONLY public profile fields needed to render public portfolio pages.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const parsed = usernameSchema.safeParse(username);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid username parameter.",
        },
      },
      { status: 400 }
    );
  }

  const { isConfigured } = getSupabasePublicConfig();
  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "display_name, username, avatar_path, bio, website_url, social_links"
        )
        .eq("username", parsed.data)
        .maybeSingle();

      if (error || !profile) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Public designer profile not found.",
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: { profile } });
    }
  }

  if (parsed.data !== DEMO_DESIGNER_PROFILE.username) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Public designer profile not found.",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      profile: {
        display_name: DEMO_DESIGNER_PROFILE.displayName,
        username: DEMO_DESIGNER_PROFILE.username,
        avatar_path: null,
        bio: DEMO_DESIGNER_PROFILE.bio,
        website_url: DEMO_DESIGNER_PROFILE.websiteUrl,
        social_links: DEMO_DESIGNER_PROFILE.socialLinks,
      },
    },
  });
}
