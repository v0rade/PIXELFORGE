import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "signup",
  "forgot-password",
  "portfolio",
  "about",
  "contact",
  "settings",
  "assets",
  "projects",
  "collections",
  "clients",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(39, "Username must be at most 39 characters.")
  .regex(
    /^[a-z0-9][a-z0-9_-]*$/,
    "Username may only contain lowercase letters, numbers, hyphens, and underscores."
  )
  .refine((val) => !RESERVED_USERNAMES.has(val), {
    message: "This username is reserved by the system.",
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(80, "Display name cannot exceed 80 characters."),
  username: usernameSchema.optional(),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters."),
  role: z.enum(["owner", "client"]).default("owner"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(80, "Display name cannot exceed 80 characters.")
    .optional(),
  username: usernameSchema.optional(),
  bio: z
    .string()
    .trim()
    .max(600, "Bio cannot exceed 600 characters.")
    .nullable()
    .optional(),
  websiteUrl: z
    .string()
    .trim()
    .url("Website URL must be a valid http(s) URL.")
    .nullable()
    .or(z.literal(""))
    .optional(),
  socialLinks: z
    .record(z.string(), z.string().url("Social link must be a valid URL."))
    .optional(),
});
