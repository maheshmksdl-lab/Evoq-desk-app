"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DrawerActions, DrawerSection, FormField, SideDrawer, fieldClass } from "@/components/shared/desk-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveArticle } from "@/hooks/use-desk-modules";
import { KNOWLEDGE_CATEGORIES, type KnowledgeArticle } from "@/lib/mock-data/knowledge";
import { articleInputSchema, type ArticleInput } from "@/lib/schemas/desk";
import { cn } from "@/lib/utils";

type Values = Omit<ArticleInput, "keywords"> & { keywords: string };
type Errors = Partial<Record<keyof ArticleInput, string>>;

/** Write or edit a help-center article. Mount with a fresh `key` per open. */
export function ArticleDrawer({ open, onOpenChange, article }: { open: boolean; onOpenChange: (o: boolean) => void; article?: KnowledgeArticle }) {
  const router = useRouter();
  const save = useSaveArticle();
  const [values, setValues] = useState<Values>(() =>
    article
      ? { title: article.title, summary: article.summary, body: article.body, category: article.category, status: article.status, keywords: article.keywords.join(", ") }
      : { title: "", summary: "", body: "", category: "Getting started", status: "draft", keywords: "" },
  );
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (status: ArticleInput["status"]) => {
    const parsed = articleInputSchema.safeParse({
      ...values,
      status,
      keywords: values.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof ArticleInput] ??= i.message;
      setErrors(next);
      document.getElementById(`ar-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    save.mutate(
      { id: article?.id, input: parsed.data },
      {
        onSuccess: (a) => {
          toast.success(status === "published" ? "Article published" : "Draft saved", { description: a.title });
          onOpenChange(false);
          if (!article) router.push(`/knowledge/${a.id}`);
        },
      },
    );
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={BookOpenIcon}
      title={article ? "Edit article" : "New article"}
      subtitle={article ? article.title : "Published articles can be suggested and linked in replies"}
      width={680}
      footer={
        <>
          <DrawerActions onCancel={() => onOpenChange(false)} onSubmit={() => submit("published")} submitLabel={save.isPending ? "Saving…" : "Publish"} disabled={save.isPending} />
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={save.isPending}
            className="order-first mr-auto h-10 rounded-[9px] border border-line bg-white px-4 text-button font-semibold text-ink transition-colors hover:border-desk disabled:opacity-60"
          >
            Save as draft
          </button>
        </>
      }
    >
      <DrawerSection title="Article">
        <div className="grid gap-4">
          <FormField label="Title" htmlFor="ar-title" error={errors.title}>
            <input id="ar-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Connecting your calendar" aria-invalid={!!errors.title} className={fieldClass} />
          </FormField>
          <FormField label="Summary" htmlFor="ar-summary" error={errors.summary}>
            <input id="ar-summary" value={values.summary} onChange={(e) => set("summary", e.target.value)} placeholder="One line shown in search and suggestions" aria-invalid={!!errors.summary} className={fieldClass} />
          </FormField>
          <FormField label="Content" htmlFor="ar-body" error={errors.body}>
            <textarea
              id="ar-body"
              value={values.body}
              onChange={(e) => set("body", e.target.value)}
              rows={10}
              placeholder="Steps, screenshots described in words, and what to do if it still doesn't work."
              aria-invalid={!!errors.body}
              className={cn(fieldClass, "h-auto resize-y py-2.5 leading-relaxed")}
            />
          </FormField>
        </div>
      </DrawerSection>
      <DrawerSection title="Discovery">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="ar-category">
            <Select value={values.category} onValueChange={(v) => set("category", v as Values["category"])}>
              <SelectTrigger id="ar-category" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Keywords (comma separated)" htmlFor="ar-keywords" error={errors.keywords}>
            <input id="ar-keywords" value={values.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="calendar, sync, google" className={fieldClass} />
          </FormField>
        </div>
        <p className="mt-2 text-caption text-ink-muted">Keywords are matched against ticket subjects and tags to suggest this article in the ticket workspace.</p>
      </DrawerSection>
    </SideDrawer>
  );
}
