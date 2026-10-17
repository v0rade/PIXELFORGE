import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createNotification } from "@/lib/notifications/service";
import { recordActivityLog } from "@/lib/activity/service";
import type { ContactInquiry } from "@/types";
import type { ContactInquiryInput } from "@/lib/validation/contact";

// In-Memory Fallback Store for Local Development
let localInquiriesStore: ContactInquiry[] = [
  {
    id: "inq_01",
    portfolioOwnerId: "usr_owner_01",
    senderName: "Dr. Aris Thorne",
    senderEmail: "aris@chronos-initiative.example",
    subject: "Brand Identity",
    message: "Interested in commissioning a complete optical geometric brand architecture for a research observatory.",
    status: "new",
    createdAt: "2026-10-16T12:00:00Z",
  },
  {
    id: "inq_02",
    portfolioOwnerId: "usr_owner_01",
    senderName: "Nadia Bell",
    senderEmail: "nadia@apex-sound.example",
    subject: "UI Visual Design",
    message: "Requesting quote for dark-first synthesizer companion iPad application interface and design tokens.",
    status: "read",
    createdAt: "2026-10-14T09:30:00Z",
  },
];

export async function submitContactInquiry(
  input: ContactInquiryInput
): Promise<{ success: boolean; inquiryId: string; simulated?: boolean }> {
  // 1. Anti-Spam Check: Honeypot field must be empty
  if (input.website_hp && input.website_hp.trim().length > 0) {
    // Silently succeed for bots without inserting to database
    return { success: true, inquiryId: "inq_bot_rejected", simulated: true };
  }

  // 2. Anti-Spam Check: Time elapsed (must not be sub-second submission)
  if (input.renderedAt && Date.now() - input.renderedAt < 1200) {
    return { success: true, inquiryId: "inq_speed_rejected", simulated: true };
  }

  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Resolve portfolio owner ID
      let ownerId = input.portfolioOwnerId;
      if (!ownerId) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();

        ownerId = ownerProfile?.id || "11111111-1111-4111-8111-111111111111";
      }

      const { data, error } = await supabase
        .from("contact_inquiries")
        .insert({
          portfolio_owner_id: ownerId,
          sender_name: input.senderName,
          sender_email: input.senderEmail,
          subject: input.subject || null,
          message: input.message,
          status: "new",
          created_at: now,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error("Failed to record inquiry in studio queue.");
      }

      // Notify the studio owner of the new commission inquiry
      await createNotification({
        recipientId: ownerId,
        actorId: null,
        eventType: "contact_inquiry_received",
        payload: {
          summary: `New inquiry from ${input.senderName}`,
          detail: `${input.subject}: ${input.message.slice(0, 120)}...`,
          resourceType: "contact_inquiry",
          resourceId: data.id,
          actionUrl: "/dashboard/clients",
        },
      });

      // Record in activity log
      await recordActivityLog({
        actorId: null,
        eventType: "contact_inquiry_received",
        metadata: {
          senderName: input.senderName,
          subject: input.subject,
        },
      });

      return { success: true, inquiryId: data.id };
    }
  }

  // Local fallback
  const localInquiry: ContactInquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    portfolioOwnerId: input.portfolioOwnerId || "usr_owner_01",
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    subject: input.subject || null,
    message: input.message,
    status: "new",
    createdAt: now,
  };

  localInquiriesStore = [localInquiry, ...localInquiriesStore];

  // Notify in local store
  await createNotification({
    recipientId: "usr_owner_01",
    actorId: null,
    eventType: "contact_inquiry_received",
    payload: {
      summary: `New inquiry from ${input.senderName}`,
      detail: `${input.subject}: ${input.message.slice(0, 120)}...`,
      resourceType: "contact_inquiry",
      resourceId: localInquiry.id,
      actionUrl: "/dashboard/clients",
    },
  });

  return { success: true, inquiryId: localInquiry.id };
}

export async function listContactInquiries(
  ownerId: string
): Promise<ContactInquiry[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Supabase RLS enforces portfolio_owner_id = auth.uid()
      const { data, error } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("portfolio_owner_id", ownerId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          portfolioOwnerId: row.portfolio_owner_id,
          senderName: row.sender_name,
          senderEmail: row.sender_email,
          subject: row.subject,
          message: row.message,
          status: row.status as ContactInquiry["status"],
          createdAt: row.created_at,
        }));
      }
    }
  }

  // Local fallback: only return inquiries owned by this portfolio owner
  return localInquiriesStore.filter((i) => i.portfolioOwnerId === ownerId);
}

export async function updateContactInquiryStatus(
  ownerId: string,
  inquiryId: string,
  status: "new" | "read" | "archived"
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("contact_inquiries")
        .update({ status })
        .eq("id", inquiryId)
        .eq("portfolio_owner_id", ownerId);

      return !error;
    }
  }

  // Local fallback
  const found = localInquiriesStore.find((i) => i.id === inquiryId);
  if (!found) return false;
  if (found.portfolioOwnerId !== ownerId) {
    throw new Error("Forbidden: you do not own this contact inquiry.");
  }
  found.status = status;
  return true;
}
