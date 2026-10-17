import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isEmailProviderConfigured } from "@/lib/notifications/service";

/**
 * Safe operational health-check endpoint for uptime monitoring and deployment verification.
 * Never exposes environment variable values, database URLs, or internal stack traces.
 */
export async function GET() {
  const { isConfigured: supabaseConfigured } = getSupabasePublicConfig();
  const emailConfigured = isEmailProviderConfigured();

  return NextResponse.json(
    {
      data: {
        status: "ok",
        service: "pixelforge-creative-asset-studio",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        capabilities: {
          databaseMode: supabaseConfigured ? "supabase_cloud" : "local_studio",
          storageMode: supabaseConfigured ? "supabase_private_bucket" : "local_studio",
          transactionalEmail: emailConfigured ? "configured" : "unconfigured",
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
