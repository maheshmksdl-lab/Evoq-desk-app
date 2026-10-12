"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addCustomerNote,
  createCustomer,
  deleteCustomerNote,
  getCustomer,
  listContacts,
  listCustomers,
  saveContact,
  updateCustomer,
  type CustomerQuery,
} from "@/lib/api/customers";
import { deleteArticle, getArticle, listArticles, rateArticle, saveArticle, setArticleStatus, type ArticleQuery } from "@/lib/api/knowledge";
import { deleteRule, listRules, previewRule, runRule, saveRule, setRuleEnabled, type RuleInput } from "@/lib/api/automations";
import { deleteNotification, listNotifications, markNotifications } from "@/lib/api/notifications";
import { getReport, type ReportRange } from "@/lib/api/reports";
import { deleteSavedReply, saveSavedReply, type SavedReplyInput } from "@/lib/api/saved-replies";
import {
  getNotificationSettings,
  getProfile,
  getSlaPolicies,
  listTeamMembers,
  updateAgent,
  updateNotificationSettings,
  updateProfile,
  updateSlaPolicy,
  type NotificationPrefs,
} from "@/lib/api/settings";
import type { AgentEdit, ArticleInput, ContactInput, CustomerInput, ProfileInput, SlaPolicy } from "@/lib/schemas/desk";
import type { ArticleStatus } from "@/lib/mock-data/knowledge";
import type { AutomationRule, TicketPriority } from "@/lib/types/ticket";
import { savedReplyKeys } from "./use-saved-replies";
import { ticketKeys } from "./use-tickets";

/**
 * Query hooks for the modules around the ticket workspace. Anything computed
 * from tickets (customers, reports, automation matches) is read with
 * staleTime 0, so it refetches whenever it's shown and never lags a change
 * made in the Inbox.
 */
export const deskKeys = {
  customers: ["customers"] as const,
  customerList: (q: CustomerQuery) => ["customers", "list", q] as const,
  contacts: (q: string, page: number, size: number) => ["customers", "contacts", q, page, size] as const,
  customer: (id: string) => ["customers", "detail", id] as const,
  knowledge: ["knowledge"] as const,
  articles: (q: ArticleQuery) => ["knowledge", "list", q] as const,
  article: (id: string) => ["knowledge", "detail", id] as const,
  rules: ["automations"] as const,
  rulePreview: (rule: Pick<AutomationRule, "conditions" | "trigger">) => ["automations", "preview", rule] as const,
  reports: ["reports"] as const,
  report: (range: ReportRange, team: string | null) => ["reports", range, team] as const,
  notifications: ["notifications"] as const,
  profile: ["settings", "profile"] as const,
  notificationPrefs: ["settings", "notification-prefs"] as const,
  team: ["settings", "team"] as const,
  sla: ["settings", "sla"] as const,
};

const live = { staleTime: 0 } as const;
const failed = (e: unknown) => toast.error(e instanceof Error && e.message && !e.message.includes("not found") ? e.message : "That change couldn't be saved. Please try again.");

// ── Customers ────────────────────────────────────────────────────────

export const useCustomers = (q: CustomerQuery) => useQuery({ queryKey: deskKeys.customerList(q), queryFn: () => listCustomers(q), placeholderData: keepPreviousData, ...live });
export const useContacts = (q: string, page: number, size: number) =>
  useQuery({ queryKey: deskKeys.contacts(q, page, size), queryFn: () => listContacts(q, page, size), placeholderData: keepPreviousData, ...live });
export const useCustomer = (id: string) => useQuery({ queryKey: deskKeys.customer(id), queryFn: () => getCustomer(id), ...live });

/** Customers and contacts feed the ticket requester pickers and rows, so lookups and tickets refresh too. */
function useCustomerSync() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: deskKeys.customers });
    void qc.invalidateQueries({ queryKey: ticketKeys.lookups });
    void qc.invalidateQueries({ queryKey: ticketKeys.all });
  };
}

export function useSaveCustomer() {
  const sync = useCustomerSync();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CustomerInput }) => (id ? updateCustomer(id, input) : createCustomer(input)),
    onSuccess: sync,
    onError: failed,
  });
}

export function useSaveContact() {
  const sync = useCustomerSync();
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: ContactInput }) => saveContact(input, id), onSuccess: sync, onError: failed });
}

export function useCustomerNotes(customerId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: deskKeys.customer(customerId) });
  return {
    add: useMutation({ mutationFn: (body: string) => addCustomerNote(customerId, body), onSuccess: refresh, onError: failed }),
    remove: useMutation({ mutationFn: (noteId: string) => deleteCustomerNote(customerId, noteId), onSuccess: refresh, onError: failed }),
  };
}

// ── Knowledge ────────────────────────────────────────────────────────

export const useArticles = (q: ArticleQuery) => useQuery({ queryKey: deskKeys.articles(q), queryFn: () => listArticles(q), placeholderData: keepPreviousData, ...live });
export const useArticle = (id: string) => useQuery({ queryKey: deskKeys.article(id), queryFn: () => getArticle(id), ...live });

function useKnowledgeSync() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: deskKeys.knowledge });
    void qc.invalidateQueries({ queryKey: ticketKeys.overview() });
    void qc.invalidateQueries({ queryKey: ["search"] });
  };
}

export function useSaveArticle() {
  const sync = useKnowledgeSync();
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: ArticleInput }) => saveArticle(input, id), onSuccess: sync, onError: failed });
}
export function useArticleStatus() {
  const sync = useKnowledgeSync();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: ArticleStatus }) => setArticleStatus(id, status), onSuccess: sync, onError: failed });
}
export function useDeleteArticle() {
  const sync = useKnowledgeSync();
  return useMutation({ mutationFn: deleteArticle, onSuccess: sync, onError: failed });
}
export function useRateArticle() {
  const sync = useKnowledgeSync();
  return useMutation({ mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => rateArticle(id, helpful), onSuccess: sync, onError: failed });
}

// ── Automations ──────────────────────────────────────────────────────

export const useRules = () => useQuery({ queryKey: deskKeys.rules, queryFn: listRules, ...live });
export const useRulePreview = (rule: Pick<AutomationRule, "conditions" | "trigger">, enabled = true) =>
  useQuery({ queryKey: deskKeys.rulePreview(rule), queryFn: () => previewRule(rule), placeholderData: keepPreviousData, enabled, ...live });

export function useSaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RuleInput }) => saveRule(input, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: deskKeys.rules }),
    onError: failed,
  });
}
export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setRuleEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: deskKeys.rules }),
    onError: failed,
  });
}
export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteRule, onSuccess: () => qc.invalidateQueries({ queryKey: deskKeys.rules }), onError: failed });
}
/** Running a rule changes tickets, so everything computed from tickets refreshes. */
export function useRunRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: deskKeys.rules });
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
      void qc.invalidateQueries({ queryKey: deskKeys.customers });
      void qc.invalidateQueries({ queryKey: deskKeys.reports });
    },
    onError: failed,
  });
}

// ── Reports ──────────────────────────────────────────────────────────

export const useReport = (range: ReportRange, team: string | null) =>
  useQuery({ queryKey: deskKeys.report(range, team), queryFn: () => getReport(range, team), placeholderData: keepPreviousData, ...live });

// ── Notifications ────────────────────────────────────────────────────

export const useNotifications = () => useQuery({ queryKey: deskKeys.notifications, queryFn: listNotifications, refetchInterval: 60_000 });

export function useMarkNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, read }: { ids: string[] | "all"; read: boolean }) => markNotifications(ids, read),
    // Optimistic: the dot clears the moment an agent opens a notification.
    onMutate: ({ ids, read }) => {
      qc.setQueryData(deskKeys.notifications, (xs: Awaited<ReturnType<typeof listNotifications>> | undefined) =>
        xs?.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read } : n)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: deskKeys.notifications }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteNotification, onSettled: () => qc.invalidateQueries({ queryKey: deskKeys.notifications }) });
}

// ── Settings ─────────────────────────────────────────────────────────

export const useProfile = () => useQuery({ queryKey: deskKeys.profile, queryFn: getProfile });

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProfileInput>) => updateProfile(input),
    onSuccess: (profile) => {
      qc.setQueryData(deskKeys.profile, profile);
      // Availability shows on the Overview, team lists and assignment pickers.
      void qc.invalidateQueries({ queryKey: ticketKeys.lookups });
      void qc.invalidateQueries({ queryKey: ticketKeys.overview() });
      void qc.invalidateQueries({ queryKey: deskKeys.team });
    },
    onError: failed,
  });
}

export const useNotificationPrefs = () => useQuery({ queryKey: deskKeys.notificationPrefs, queryFn: getNotificationSettings });
export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) => updateNotificationSettings(prefs),
    onSuccess: (prefs) => {
      qc.setQueryData(deskKeys.notificationPrefs, prefs);
      void qc.invalidateQueries({ queryKey: deskKeys.notifications });
    },
    onError: failed,
  });
}

export const useTeamMembers = () => useQuery({ queryKey: deskKeys.team, queryFn: listTeamMembers, ...live });
export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AgentEdit }) => updateAgent(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: deskKeys.team });
      void qc.invalidateQueries({ queryKey: deskKeys.profile });
      void qc.invalidateQueries({ queryKey: ticketKeys.lookups });
      void qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
    onError: failed,
  });
}

export const useSlaPolicies = () => useQuery({ queryKey: deskKeys.sla, queryFn: getSlaPolicies });
export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ priority, policy }: { priority: TicketPriority; policy: SlaPolicy }) => updateSlaPolicy(priority, policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: deskKeys.sla }),
    onError: failed,
  });
}

export function useSaveSavedReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SavedReplyInput }) => saveSavedReply(input, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: savedReplyKeys.all }),
    onError: failed,
  });
}
export function useDeleteSavedReply() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteSavedReply, onSuccess: () => qc.invalidateQueries({ queryKey: savedReplyKeys.all }), onError: failed });
}
