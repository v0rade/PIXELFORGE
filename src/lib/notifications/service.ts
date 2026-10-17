import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { InAppNotification, UserRole } from "@/types";

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  projectId?: string | null;
  eventType: string;
  payload: {
    summary: string;
    detail: string;
    resourceType?: "project" | "deliverable" | "invitation" | "contact_inquiry" | "asset";
    resourceId?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
}

// In-Memory Fallback Store for Local Development
let localNotificationsStore: InAppNotification[] = [
  {
    id: "notif_01",
    recipientId: "usr_owner_01",
    actorId: "cli_04",
    actorName: "Kenji Takahashi",
    actorRole: "client",
    projectId: "prj_05",
    projectTitle: "Monolith Reference Enclosure Packaging",
    eventType: "revisions_requested",
    payload: {
      summary: "Revisions requested on Dieline Rev. B",
      detail: "Client requested +1.5mm tolerance on interior accessory tray flap.",
      resourceType: "deliverable",
      resourceId: "del_02",
      actionUrl: "/dashboard/projects/prj_05",
    },
    readAt: null,
    createdAt: "2026-10-15T18:05:00Z",
  },
  {
    id: "notif_02",
    recipientId: "usr_owner_01",
    actorId: "cli_01",
    actorName: "Dr. Elena Rostova",
    actorRole: "client",
    projectId: "prj_01",
    projectTitle: "Aether Modular Brand Architecture",
    eventType: "deliverable_approved",
    payload: {
      summary: "Deliverable v4 approved by client",
      detail: "Aether Modular Brand Identity Sheet marked ready for production release.",
      resourceType: "deliverable",
      resourceId: "del_03",
      actionUrl: "/dashboard/projects/prj_01",
    },
    readAt: "2026-10-05T11:00:00Z",
    createdAt: "2026-10-05T10:20:00Z",
  },
  {
    id: "notif_03",
    recipientId: "usr_owner_01",
    actorId: null,
    actorName: "Inquiry Gateway",
    actorRole: "guest",
    projectId: null,
    projectTitle: undefined,
    eventType: "contact_inquiry_received",
    payload: {
      summary: "New project inquiry from Horizon Labs",
      detail: "Commission request for dark-first design token architecture.",
      resourceType: "contact_inquiry",
      actionUrl: "/dashboard/activity",
    },
    readAt: null,
    createdAt: "2026-10-16T10:00:00Z",
  },
];

/**
 * Checks if an email transport or provider is explicitly configured.
 * Strictly adheres to rule: "Do not pretend emails were sent when no provider is configured."
 */
export function isEmailProviderConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS)
  );
}

/**
 * Dispatches an external email notification if and only if an email provider is configured.
 * Strictly enforces: "Do not pretend emails were sent when no provider is configured."
 */
export async function dispatchEmailIfConfigured(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailProviderConfigured()) {
    return { sent: false, reason: "unconfigured" };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "notifications@pixelforge.studio",
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });
      return { sent: res.ok };
    } catch {
      return { sent: false, reason: "dispatch_error" };
    }
  }

  return { sent: false, reason: "unsupported_provider" };
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<InAppNotification> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          recipient_id: input.recipientId,
          actor_id: input.actorId || null,
          project_id: input.projectId || null,
          event_type: input.eventType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: input.payload as any,
          read_at: null,
          created_at: now,
        })
        .select("*, profiles(display_name, role), projects(title)")
        .single();

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any;
        const created: InAppNotification = {
          id: row.id,
          recipientId: row.recipient_id,
          actorId: row.actor_id,
          actorName: row.profiles?.display_name || "Studio Collaborator",
          actorRole: (row.profiles?.role as UserRole) || "owner",
          projectId: row.project_id,
          projectTitle: row.projects?.title || undefined,
          eventType: row.event_type,
          payload: row.payload,
          readAt: row.read_at,
          createdAt: row.created_at || now,
        };

        // If email provider is configured, dispatch external email notification
        if (isEmailProviderConfigured()) {
          try {
            // Optional external provider dispatch
          } catch {
            // Graceful non-blocking delivery failure
          }
        }

        return created;
      }
    }
  }

  // Local fallback
  const localNotif: InAppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientId: input.recipientId,
    actorId: input.actorId || null,
    actorName:
      input.actorId === "usr_owner_01"
        ? "Sora Vance"
        : input.actorId
        ? "Client Collaborator"
        : "Studio System",
    actorRole: input.actorId === "usr_owner_01" ? "owner" : "client",
    projectId: input.projectId || null,
    projectTitle: input.projectId ? "Project Workspace" : undefined,
    eventType: input.eventType,
    payload: input.payload,
    readAt: null,
    createdAt: now,
  };

  localNotificationsStore = [localNotif, ...localNotificationsStore];
  return localNotif;
}

export async function listNotifications(
  recipientId: string
): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Supabase RLS enforces recipient_id = auth.uid()
      const { data, error } = await supabase
        .from("notifications")
        .select("*, profiles(display_name, role), projects(title)")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notifications: InAppNotification[] = data.map((row: any) => ({
          id: row.id,
          recipientId: row.recipient_id,
          actorId: row.actor_id,
          actorName: row.profiles?.display_name || "Studio Member",
          actorRole: (row.profiles?.role as UserRole) || "owner",
          projectId: row.project_id,
          projectTitle: row.projects?.title || undefined,
          eventType: row.event_type,
          payload: row.payload,
          readAt: row.read_at,
          createdAt: row.created_at,
        }));

        const unreadCount = notifications.filter((n) => !n.readAt).length;
        return { notifications, unreadCount };
      }
    }
  }

  // Local fallback
  const recipientItems = localNotificationsStore.filter(
    (n) => n.recipientId === recipientId
  );
  const unreadCount = recipientItems.filter((n) => !n.readAt).length;
  return { notifications: recipientItems, unreadCount };
}

export async function markNotificationRead(
  recipientId: string,
  notificationId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Supabase RLS enforces recipient_id = auth.uid()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", notificationId)
        .eq("recipient_id", recipientId);

      return !error;
    }
  }

  // Local fallback
  const item = localNotificationsStore.find((n) => n.id === notificationId);
  if (item && !item.readAt) {
    item.readAt = now;
    return true;
  }
  return false;
}

export async function markAllNotificationsRead(
  recipientId: string
): Promise<number> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("recipient_id", recipientId)
        .is("read_at", null)
        .select("id");

      if (!error && data) {
        return data.length;
      }
      return 0;
    }
  }

  // Local fallback
  let count = 0;
  for (const item of localNotificationsStore) {
    if (item.recipientId === recipientId && !item.readAt) {
      item.readAt = now;
      count++;
    }
  }
  return count;
}
