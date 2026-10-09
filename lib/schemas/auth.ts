import { z } from "zod";
import { AGENT_ROLES } from "@/lib/types/ticket";

/** Countries offered at sign-up, each with the time zones agents can work in. */
export const SIGNUP_REGIONS: Record<string, string[]> = {
  India: ["Asia/Kolkata"],
  "United States": ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
  "United Kingdom": ["Europe/London"],
  Germany: ["Europe/Berlin"],
  "United Arab Emirates": ["Asia/Dubai"],
  Singapore: ["Asia/Singapore"],
  Australia: ["Australia/Sydney", "Australia/Melbourne", "Australia/Perth"],
  Canada: ["America/Toronto", "America/Vancouver"],
};

const email = z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address."));

export const forgotPasswordSchema = z.object({ email });

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80, "Keep your name under 80 characters."),
    email,
    mobile: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid mobile number."),
    role: z.enum(AGENT_ROLES, { error: "Choose your role." }),
    company: z.string().trim().min(2, "Enter your company or workspace name.").max(120),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
    confirm: z.string(),
    team: z.string().min(1, "Choose your team."),
    country: z.string().min(1, "Choose your country."),
    timeZone: z.string().min(1, "Choose your time zone."),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match." });

export type SignUpInput = z.infer<typeof signUpSchema>;
