import { z } from "zod";

export const contactInquirySchema = z.object({
  senderName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  senderEmail: z
    .string()
    .trim()
    .email("A valid email address is required.")
    .max(255),
  subject: z
    .string()
    .trim()
    .min(1, "Please provide or select a project subject.")
    .max(150, "Subject cannot exceed 150 characters."),
  message: z
    .string()
    .trim()
    .min(10, "Please describe your project scope (minimum 10 characters).")
    .max(3000, "Message cannot exceed 3000 characters."),
  portfolioOwnerId: z.string().optional(),
  // Anti-Spam: Honeypot field (must remain empty)
  website_hp: z.string().optional().default(""),
  // Anti-Spam: Rendered timestamp to detect robotic instant submissions
  renderedAt: z.number().optional(),
});

export type ContactInquiryInput = z.input<typeof contactInquirySchema>;

export const updateInquiryStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;
