import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { ActivityLogItem, UserRole } from "@/types";

export interface RecordActivityInput {
  actorId: string | null;
  projectId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}

export interface ListActivityQuery {
  limit?: number;
  eventType?: string;
  projectId?: string;
}

// In-Memory Fallback Store for Local Development
let localActivityStore: ActivityLogItem[] = [
  {
    id: "act_01",
    actorId: "usr_owner_01",
    actorName: "Sora Vance",
    actorRole: "owner",
    projectId: "prj_02",
    projectTitle: "Chronos OS Design System & UI Kit",
    eventType: "deliverable_submitted",
    metadata: {
      versionNumber: 3,
      deliverableName: "Chronos Dark-First UI Component Matrix",
    },
    createdAt: "2026-10-16T08:10:00Z",
  },
  {
    id: "act_02",
    actorId: "cli_04",
    actorName: "Kenji Takahashi",
    actorRole: "client",
    projectId: "prj_05",
    projectTitle: "Monolith Reference Enclosure Packaging",
    eventType: "revisions_requested",
    metadata: {
      deliverableName: "Monolith Hardware Packaging Dieline Rev. B",
      note: "Adjust interior flap tolerance by +1.5mm",
    },
    createdAt: "2026-10-15T18:05:00Z",
  },
  {
    id: "act_03",
    actorId: "usr_owner_01",
    actorName: "Sora Vance",
    actorRole: "owner",
    projectId: "prj_01",
    projectTitle: "Aether Modular Brand Architecture",
    eventType: "asset_uploaded",
    metadata: {
      assetName: "aether-brand-identity-v3.svg",
      fileSize: 482910,
    },
    createdAt: "2026-10-15T14:20:00Z",
  },
  {
    id: "act_04",
    actorId: "cli_01",
    actorName: "Dr. Elena Rostova",
    actorRole: "client",
    projectId: "prj_01",
    projectTitle: "Aether Modular Brand Architecture",
    eventType: "deliverable_approved",
    metadata: {
      deliverableName: "Aether Modular Brand Identity Sheet",
      signOffRole: "client",
    },
    createdAt: "2026-10-05T10:20:00Z",
  },
  {
    id: "act_05",
    actorId: "usr_owner_01",
    actorName: "Sora Vance",
    actorRole: "owner",
    projectId: "prj_01",
    projectTitle: "Aether Modular Brand Architecture",
    eventType: "project_created",
    metadata: {
      title: "Aether Modular Brand Architecture",
    },
    createdAt: "2026-08-15T09:00:00Z",
  },
];

/**
 * Sanitizes metadata to strip sensitive security tokens, passwords, or raw secrets.
 */
export function sanitizeActivityMetadata(
  metadata?: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  if (!metadata || Object.keys(metadata).length === 0) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  const forbiddenPatterns = [
    /pass/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /hash/i,
    /credential/i,
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(key));
    if (!isForbidden) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export async function recordActivityLog(
  input: RecordActivityInput
): Promise<ActivityLogItem> {
  const now = new Date().toISOString();
  const safeMetadata = sanitizeActivityMetadata(input.metadata);

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("activity_logs")
        .insert({
          actor_id: input.actorId,
          project_id: input.projectId || null,
          event_type: input.eventType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (safeMetadata || {}) as any,
          created_at: now,
        })
        .select("*, profiles(display_name, role), projects(title)")
        .single();

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any;
        return {
          id: row.id,
          actorId: row.actor_id,
          actorName: row.profiles?.display_name || "Studio Member",
          actorRole: (row.profiles?.role as UserRole) || "owner",
          projectId: row.project_id,
          projectTitle: row.projects?.title || null,
          eventType: row.event_type,
          metadata: (row.metadata as Record<string, unknown>) || {},
          createdAt: row.created_at || now,
        };
      }
    }
  }

  // Local fallback
  const localItem: ActivityLogItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actorId: input.actorId,
    actorName: input.actorId === "usr_owner_01" ? "Sora Vance" : "Studio Member",
    actorRole: input.actorId === "usr_owner_01" ? "owner" : "client",
    projectId: input.projectId || null,
    projectTitle: input.projectId ? "Project Workspace" : null,
    eventType: input.eventType,
    metadata: safeMetadata || {},
    createdAt: now,
  };

  localActivityStore = [localItem, ...localActivityStore];
  return localItem;
}

export async function listActivityLogs(
  userId: string,
  query: ListActivityQuery = {}
): Promise<ActivityLogItem[]> {
  const limit = Math.min(Math.max(query.limit || 50, 1), 100);
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Supabase RLS enforces actor_id = auth.uid() OR authorized project owner / member
      let req = supabase
        .from("activity_logs")
        .select("*, profiles(display_name, role), projects(title)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (query.eventType && query.eventType !== "all") {
        req = req.eq("event_type", query.eventType);
      }

      if (query.projectId && query.projectId !== "all") {
        req = req.eq("project_id", query.projectId);
      }

      const { data, error } = await req;
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((row: any) => ({
          id: row.id,
          actorId: row.actor_id,
          actorName: row.profiles?.display_name || "Studio Member",
          actorRole: (row.profiles?.role as UserRole) || "owner",
          projectId: row.project_id,
          projectTitle: row.projects?.title || null,
          eventType: row.event_type,
          metadata: (row.metadata as Record<string, unknown>) || {},
          createdAt: row.created_at,
        }));
      }
    }
  }

  // Local fallback
  let filtered = [...localActivityStore];

  if (query.eventType && query.eventType !== "all") {
    filtered = filtered.filter((a) => a.eventType === query.eventType);
  }

  if (query.projectId && query.projectId !== "all") {
    filtered = filtered.filter((a) => a.projectId === query.projectId);
  }

  return filtered.slice(0, limit);
}
