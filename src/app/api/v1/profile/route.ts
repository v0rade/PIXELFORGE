import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  encodeLocalSession,
  getServerSessionUser,
  LOCAL_SESSION_COOKIE,
} from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { DEMO_DESIGNER_PROFILE } from "@/lib/demo/data";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required to access your studio profile.",
        },
      },
      { status: 401 }
    );
  }

  const { isConfigured } = getSupabasePublicConfig();
  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, role, avatar_path, bio, website_url, social_links, created_at, updated_at"
        )
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        return NextResponse.json(
          {
            error: {
              code: "PROFILE_NOT_FOUND",
              message: "Profile record could not be located.",
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: { profile } });
    }
  }

  return NextResponse.json({
    data: {
      profile: {
        id: user.id,
        display_name: user.displayName,
        username: user.username,
        role: user.role,
        avatar_path: null,
        bio: DEMO_DESIGNER_PROFILE.bio,
        website_url: DEMO_DESIGNER_PROFILE.websiteUrl,
        social_links: DEMO_DESIGNER_PROFILE.socialLinks,
      },
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication is required to update your studio profile.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Explicitly reject any attempt to supply id or role in the payload
    if ("id" in body || "role" in body || "owner_id" in body) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN_FIELD",
            message:
              "Authorization and identity fields cannot be modified via profile updates.",
          },
        },
        { status: 403 }
      );
    }

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ??
              "The submitted profile data is invalid.",
          },
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const { isConfigured } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const { data: updated, error } = await supabase
          .from("profiles")
          .update({
            ...(updates.displayName !== undefined && {
              display_name: updates.displayName,
            }),
            ...(updates.username !== undefined && {
              username: updates.username,
            }),
            ...(updates.bio !== undefined && { bio: updates.bio }),
            ...(updates.websiteUrl !== undefined && {
              website_url: updates.websiteUrl || null,
            }),
            ...(updates.socialLinks !== undefined && {
              social_links: updates.socialLinks,
            }),
          })
          .eq("id", user.id)
          .select(
            "id, display_name, username, role, avatar_path, bio, website_url, social_links, updated_at"
          )
          .single();

        if (error) {
          return NextResponse.json(
            {
              error: {
                code: "PROFILE_UPDATE_FAILED",
                message: "Unable to update profile. Username may already be taken.",
              },
            },
            { status: 400 }
          );
        }

        return NextResponse.json({ data: { profile: updated } });
      }
    }

    const updatedSession = {
      ...user,
      displayName: updates.displayName ?? user.displayName,
      username: updates.username ?? user.username,
    };

    const cookieStore = await cookies();
    cookieStore.set(LOCAL_SESSION_COOKIE, encodeLocalSession(updatedSession), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      data: {
        profile: {
          id: updatedSession.id,
          display_name: updatedSession.displayName,
          username: updatedSession.username,
          role: updatedSession.role,
          bio: updates.bio ?? DEMO_DESIGNER_PROFILE.bio,
          website_url: updates.websiteUrl ?? DEMO_DESIGNER_PROFILE.websiteUrl,
          social_links: updates.socialLinks ?? DEMO_DESIGNER_PROFILE.socialLinks,
        },
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Malformed profile update request.",
        },
      },
      { status: 400 }
    );
  }
}
