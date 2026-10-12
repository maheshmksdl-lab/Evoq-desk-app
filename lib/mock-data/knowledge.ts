export const KNOWLEDGE_CATEGORIES = ["Billing", "Account", "Reporting", "Security", "Data & imports", "Getting started"] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const ARTICLE_STATUSES = ["published", "draft"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

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
  category: KnowledgeCategory;
  /** Drafts are visible in Knowledge only — never suggested or linked in replies. */
  status: ArticleStatus;
  authorId: string;
  /** Help-center page views. */
  views: number;
  /** Readers who marked it helpful / not helpful. */
  helpful: number;
  notHelpful: number;
  updatedAt: string;
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
    category: "Billing",
    status: "published",
    authorId: "agt-emily",
    views: 2140,
    helpful: 184,
    notHelpful: 21,
    updatedAt: daysAgo(6),
  },
  {
    id: "kb-order-status",
    title: "Checking order status",
    summary: "How to verify payment and order status for customers.",
    body: "Open the customer's account, then Orders. Each order shows its payment state and fulfilment step; a pending payment holds fulfilment for up to 24 hours before it's cancelled automatically.",
    url: "https://help.desk.example/articles/order-status",
    uses: 12,
    keywords: ["order", "status", "payment", "shipping"],
    category: "Billing",
    status: "published",
    authorId: "agt-emma",
    views: 1380,
    helpful: 97,
    notHelpful: 14,
    updatedAt: daysAgo(12),
  },
  {
    id: "kb-password-reset",
    title: "Resetting your password",
    summary: "Help customers reset their account password.",
    body: "Send a reset link from the customer's profile. Links expire after 30 minutes. If the email doesn't arrive, check the address on file and the customer's spam folder, then resend.",
    url: "https://help.desk.example/articles/password-reset",
    uses: 9,
    keywords: ["password", "reset", "login", "account", "locked"],
    category: "Account",
    status: "published",
    authorId: "agt-sarah",
    views: 3260,
    helpful: 301,
    notHelpful: 18,
    updatedAt: daysAgo(21),
  },
  {
    id: "kb-report-exports",
    title: "Exporting large reports",
    summary: "Use async exports when a report times out.",
    body: "Exports over roughly 50,000 rows can time out in the legacy reporting module. Switch the report to the new module and choose Export → Email me when ready; the file arrives as a download link.",
    url: "https://help.desk.example/articles/report-exports",
    uses: 7,
    keywords: ["export", "report", "reporting", "timeout", "csv", "audit"],
    category: "Reporting",
    status: "published",
    authorId: "agt-daniel",
    views: 940,
    helpful: 88,
    notHelpful: 9,
    updatedAt: daysAgo(3),
  },
  {
    id: "kb-two-factor",
    title: "Two-factor authentication after a phone change",
    summary: "Re-enrol 2FA when the old device is gone.",
    body: "Verify the customer's identity, then use Security → Reset 2FA on their profile. They'll be asked to scan a new QR code at next sign-in. Backup codes generated before the reset stop working.",
    url: "https://help.desk.example/articles/two-factor",
    uses: 6,
    keywords: ["two-factor", "2fa", "authenticator", "phone", "codes", "security", "login"],
    category: "Security",
    status: "published",
    authorId: "agt-alex",
    views: 1720,
    helpful: 143,
    notHelpful: 11,
    updatedAt: daysAgo(9),
  },
  {
    id: "kb-csv-import",
    title: "Fixing CSV import errors",
    summary: "Encoding and column issues that make imports skip rows.",
    body: "Save the file as CSV UTF-8, keep the header row exactly as in the template, and avoid merged cells. Rows with special characters are skipped when the file uses another encoding.",
    url: "https://help.desk.example/articles/csv-import",
    uses: 5,
    keywords: ["csv", "import", "rows", "encoding", "data", "upload"],
    category: "Data & imports",
    status: "published",
    authorId: "agt-james",
    views: 860,
    helpful: 64,
    notHelpful: 12,
    updatedAt: daysAgo(15),
  },
  {
    id: "kb-scheduled-reports",
    title: "Scheduled reports and time zones",
    summary: "Why scheduled reports arrive at the wrong time.",
    body: "Schedules run in the time zone set on the report owner's profile, not the workspace. Ask the customer to check Profile → Time zone, then re-save the schedule so the next run uses it.",
    url: "https://help.desk.example/articles/scheduled-reports",
    uses: 4,
    keywords: ["scheduled", "schedule", "report", "time", "zone", "email"],
    category: "Reporting",
    status: "published",
    authorId: "agt-daniel",
    views: 510,
    helpful: 41,
    notHelpful: 6,
    updatedAt: daysAgo(28),
  },
  {
    id: "kb-invoices",
    title: "Updating invoice details and VAT numbers",
    summary: "Add a VAT number and reissue past invoices.",
    body: "Add the VAT number under Billing → Company details. New invoices pick it up straight away; past invoices can be reissued from the invoice list with Reissue with current details.",
    url: "https://help.desk.example/articles/invoices",
    uses: 4,
    keywords: ["invoice", "vat", "billing", "tax", "refund", "seats"],
    category: "Billing",
    status: "published",
    authorId: "agt-emily",
    views: 1190,
    helpful: 102,
    notHelpful: 8,
    updatedAt: daysAgo(33),
  },
  {
    id: "kb-sso-setup",
    title: "Setting up single sign-on (SAML)",
    summary: "Connect Okta or Azure AD so agents sign in with SSO.",
    body: "Create a SAML app in the identity provider, paste the Desk ACS URL and entity ID, then upload the IdP metadata under Security → Single sign-on. Test with one admin account before enforcing SSO for everyone.",
    url: "https://help.desk.example/articles/sso-setup",
    uses: 0,
    keywords: ["sso", "saml", "okta", "azure", "login", "security"],
    category: "Security",
    status: "draft",
    authorId: "agt-alex",
    views: 0,
    helpful: 0,
    notHelpful: 0,
    updatedAt: daysAgo(1),
  },
  {
    id: "kb-api-rate-limits",
    title: "API rate limits and retries",
    summary: "What the 429 response means and how to back off.",
    body: "Each workspace can make 600 API requests per minute. Responses over the limit return 429 with a Retry-After header; wait that many seconds before retrying, and batch writes where the endpoint allows it.",
    url: "https://help.desk.example/articles/api-rate-limits",
    uses: 0,
    keywords: ["api", "rate", "limit", "429", "integration", "webhook"],
    category: "Getting started",
    status: "draft",
    authorId: "agt-james",
    views: 0,
    helpful: 0,
    notHelpful: 0,
    updatedAt: daysAgo(3),
  },
];

/** Articles agents can link or insert: drafts stay inside Knowledge. */
export const publishedArticles = () => KNOWLEDGE_ARTICLES.filter((a) => a.status === "published");

/**
 * Articles likely to help with a ticket: scored on keyword hits in its subject,
 * tags and category, most-used first on ties. Pure — runs on data already loaded.
 */
export function suggestArticles(ticket: { subject: string; tags: string[]; category: string }, limit = 3): KnowledgeArticle[] {
  const haystack = [ticket.subject, ...ticket.tags, ticket.category].join(" ").toLowerCase();
  return publishedArticles().map((a) => ({ a, score: a.keywords.filter((k) => haystack.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.a.uses - x.a.uses)
    .slice(0, limit)
    .map((x) => x.a);
}
