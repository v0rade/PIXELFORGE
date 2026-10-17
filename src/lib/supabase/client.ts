"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const { url, publishableKey, isConfigured } = getSupabasePublicConfig();

  if (!isConfigured) {
    return null;
  }

  return createBrowserClient<Database>(
    url,
    publishableKey
  ) as unknown as SupabaseClient<Database>;
}
