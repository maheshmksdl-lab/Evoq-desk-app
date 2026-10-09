/** Help-center articles agents link in replies; `uses` counts how often they were inserted. */
export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  /** Short article text, shown when an agent previews it in the ticket workspace. */
  body: string;
  url: string;
  uses: number;
  /** Words matched against a ticket's subject, tags and category to suggest it. */
  keywords: string[];
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "kb-payment-failures",
    title: "Troubleshooting payment failures",
    summary: "Step-by-step guide to resolve common payment issues.",
    body: "Check the card's expiry and billing address first, then look for a decline code on the invoice. Most declines clear once the customer updates the card under Billing → Payment methods; retry the charge from the invoice afterwards.",
    url: "https://help.desk.example/articles/payment-failures",
    uses: 18,
    keywords: ["payment", "card", "charge", "declined", "billing", "invoice"],
  },
  {
    id: "kb-order-status",
    title: "Checking order status",
    summary: "How to verify payment and order status for customers.",
    body: "Open the customer's account, then Orders. Each order shows its payment state and fulfilment step; a pending payment holds fulfilment for up to 24 hours before it's cancelled automatically.",
    url: "https://help.desk.example/articles/order-status",
    uses: 12,
    keywords: ["order", "status", "payment", "shipping"],
  },
  {
    id: "kb-password-reset",
    title: "Resetting your password",
    summary: "Help customers reset their account password.",
    body: "Send a reset link from the customer's profile. Links expire after 30 minutes. If the email doesn't arrive, check the address on file and the customer's spam folder, then resend.",
    url: "https://help.desk.example/articles/password-reset",
    uses: 9,
    keywords: ["password", "reset", "login", "account", "locked"],
  },
  {
    id: "kb-report-exports",
    title: "Exporting large reports",
    summary: "Use async exports when a report times out.",
    body: "Exports over roughly 50,000 rows can time out in the legacy reporting module. Switch the report to the new module and choose Export → Email me when ready; the file arrives as a download link.",
    url: "https://help.desk.example/articles/report-exports",
    uses: 7,
    keywords: ["export", "report", "reporting", "timeout", "csv", "audit"],
  },
  {
    id: "kb-two-factor",
    title: "Two-factor authentication after a phone change",
    summary: "Re-enrol 2FA when the old device is gone.",
    body: "Verify the customer's identity, then use Security → Reset 2FA on their profile. They'll be asked to scan a new QR code at next sign-in. Backup codes generated before the reset stop working.",
    url: "https://help.desk.example/articles/two-factor",
    uses: 6,
    keywords: ["two-factor", "2fa", "authenticator", "phone", "codes", "security", "login"],
  },
  {
    id: "kb-csv-import",
    title: "Fixing CSV import errors",
    summary: "Encoding and column issues that make imports skip rows.",
    body: "Save the file as CSV UTF-8, keep the header row exactly as in the template, and avoid merged cells. Rows with special characters are skipped when the file uses another encoding.",
    url: "https://help.desk.example/articles/csv-import",
    uses: 5,
    keywords: ["csv", "import", "rows", "encoding", "data", "upload"],
  },
  {
    id: "kb-scheduled-reports",
    title: "Scheduled reports and time zones",
    summary: "Why scheduled reports arrive at the wrong time.",
    body: "Schedules run in the time zone set on the report owner's profile, not the workspace. Ask the customer to check Profile → Time zone, then re-save the schedule so the next run uses it.",
    url: "https://help.desk.example/articles/scheduled-reports",
    uses: 4,
    keywords: ["scheduled", "schedule", "report", "time", "zone", "email"],
  },
  {
    id: "kb-invoices",
    title: "Updating invoice details and VAT numbers",
    summary: "Add a VAT number and reissue past invoices.",
    body: "Add the VAT number under Billing → Company details. New invoices pick it up straight away; past invoices can be reissued from the invoice list with Reissue with current details.",
    url: "https://help.desk.example/articles/invoices",
    uses: 4,
    keywords: ["invoice", "vat", "billing", "tax", "refund", "seats"],
  },
];

/**
 * Articles likely to help with a ticket: scored on keyword hits in its subject,
 * tags and category, most-used first on ties. Pure — runs on data already loaded.
 */
export function suggestArticles(ticket: { subject: string; tags: string[]; category: string }, limit = 3): KnowledgeArticle[] {
  const haystack = [ticket.subject, ...ticket.tags, ticket.category].join(" ").toLowerCase();
  return KNOWLEDGE_ARTICLES.map((a) => ({ a, score: a.keywords.filter((k) => haystack.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.a.uses - x.a.uses)
    .slice(0, limit)
    .map((x) => x.a);
}
