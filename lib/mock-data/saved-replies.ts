import type { SavedReply } from "@/lib/types/ticket";

const daysAgo = (d: number, now: number) => new Date(now - d * 86_400_000).toISOString();

/** Canned responses — inserted from the composer's Saved replies menu or by typing their /shortcut. */
export function buildSavedReplies(now: number): SavedReply[] {
  return [
    {
      id: "sr-refund",
      name: "Refund Request",
      shortcut: "/refund",
      category: "Billing",
      body: "Thanks for letting us know. I've submitted a refund for the affected charge. It's processed right away on our side, and most banks show it within 5–10 business days. I'll keep this ticket open until you confirm it has arrived.",
      usageCount: 142,
      updatedAt: daysAgo(6, now),
    },
    {
      id: "sr-password",
      name: "Password Reset",
      shortcut: "/password",
      category: "Account",
      body: "I've sent a password reset link to the email address on your account. The link is valid for 30 minutes. If it doesn't arrive, please check your spam folder, then reply here and I'll send a new one.",
      usageCount: 208,
      updatedAt: daysAgo(21, now),
    },
    {
      id: "sr-verify",
      name: "Account Verification",
      shortcut: "/verify",
      category: "Account",
      body: "To keep your account secure, I need to verify your identity before making this change. Please reply from the email address on the account, or confirm the last four digits of the card used for your most recent invoice.",
      usageCount: 87,
      updatedAt: daysAgo(34, now),
    },
    {
      id: "sr-thanks",
      name: "Thanks for Contacting Us",
      shortcut: "/thanks",
      category: "General",
      body: "Thanks for reaching out. I'm looking into this now and will update you as soon as I know more.",
      usageCount: 316,
      updatedAt: daysAgo(3, now),
    },
    {
      id: "sr-escalate",
      name: "Escalation Notice",
      shortcut: "/escalate",
      category: "Escalation",
      body: "I've escalated this to our engineering team with all the details you've provided. I'll keep this ticket updated and let you know as soon as there's progress.",
      usageCount: 64,
      updatedAt: daysAgo(12, now),
    },
    {
      id: "sr-resolved",
      name: "Issue Resolved",
      shortcut: "/resolved",
      category: "Resolution",
      body: "This should now be resolved. Could you confirm everything is working as expected on your side? If anything still looks off, just reply to this email and the ticket will reopen.",
      usageCount: 251,
      updatedAt: daysAgo(9, now),
    },
    {
      id: "sr-info",
      name: "Need More Information",
      shortcut: "/info",
      category: "General",
      body: "To help us investigate, could you share:\n\n- The steps you took before the issue appeared\n- A screenshot of any error message\n- The approximate time it happened",
      usageCount: 173,
      updatedAt: daysAgo(15, now),
    },
  ];
}
