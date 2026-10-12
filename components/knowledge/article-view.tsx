"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Breadcrumb, PageShell, Pill, PrimaryButton, SecondaryButton } from "@/components/shared/desk-ui";
import { ConfirmDialog, Panel, useDrawer } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticle, useArticleStatus, useDeleteArticle, useRateArticle } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { ArticleDrawer } from "./article-drawer";

/** One article: the content agents link, its reach, and editing / publishing. */
export function ArticleView({ articleId }: { articleId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data, isPending, isError, refetch } = useArticle(articleId);
  const drawer = useDrawer();
  const status = useArticleStatus();
  const remove = useDeleteArticle();
  const rate = useRateArticle();
  const [confirm, setConfirm] = useState(false);
  const [voted, setVoted] = useState(false);

  if (!hydrated || isPending) {
    return (
      <PageShell>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </PageShell>
    );
  }
  if (isError) return <ErrorState title="Unable to load this article" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />;
  if (!data) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        title="Article not found"
        hint="It may have been deleted."
        action={
          <Link href="/knowledge" className="inline-flex h-10 items-center rounded-lg border border-line bg-card px-4 text-button-sm font-semibold text-ink hover:border-desk">
            Back to Knowledge
          </Link>
        }
      />
    );
  }

  const { article, related } = data;
  const published = article.status === "published";
  const votes = article.helpful + article.notHelpful;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(article.url);
      toast.success("Link copied", { description: article.url });
    } catch {
      toast.error("Couldn't copy the link", { description: article.url });
    }
  };

  return (
    <PageShell>
      <Breadcrumb items={[{ label: "Knowledge", href: "/knowledge" }, { label: article.title }]} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel bodyClassName="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-desk-tint px-2 py-0.5 text-[12px] font-medium text-desk">{article.category}</span>
                <Pill tone={published ? "green" : "amber"} className="px-2 py-0.5 text-[11px]">
                  {published ? "Published" : "Draft"}
                </Pill>
              </div>
              <h1 className="mt-2 text-[26px] leading-9 font-bold tracking-tight text-ink">{article.title}</h1>
              <p className="mt-1 text-[15px] leading-6 text-ink-muted">{article.summary}</p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
                <PersonAvatar name={article.author.name} src={article.author.avatar} size="sm" />
                <span className="font-medium text-ink">{article.author.name}</span>· Updated <TimeLabel iso={article.updatedAt} />
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-y border-line-soft py-3">
            <SecondaryButton icon={PencilSimpleIcon} onClick={() => drawer.show()} className="h-9">
              Edit
            </SecondaryButton>
            {published ? (
              <SecondaryButton
                icon={EyeSlashIcon}
                className="h-9"
                disabled={status.isPending}
                onClick={() => status.mutate({ id: article.id, status: "draft" }, { onSuccess: () => toast.success("Moved to drafts", { description: "Agents can no longer link it." }) })}
              >
                Unpublish
              </SecondaryButton>
            ) : (
              <PrimaryButton
                size="md"
                icon={PaperPlaneTiltIcon}
                className="h-9"
                disabled={status.isPending}
                onClick={() => status.mutate({ id: article.id, status: "published" }, { onSuccess: () => toast.success("Article published", { description: "It can now be suggested in tickets." }) })}
              >
                Publish
              </PrimaryButton>
            )}
            <SecondaryButton icon={CopyIcon} onClick={copyLink} className="h-9" disabled={!published} title={published ? undefined : "Publish the article to share its link"}>
              Copy link
            </SecondaryButton>
            <SecondaryButton icon={TrashIcon} onClick={() => setConfirm(true)} className="h-9 text-[#EF4444] hover:border-[#EF4444] sm:ml-auto">
              Delete
            </SecondaryButton>
          </div>
          <article className="mt-5 max-w-3xl text-[15px] leading-7 whitespace-pre-wrap text-ink-body">{article.body}</article>
          {article.keywords.length > 0 && (
            <div className="mt-6">
              <h2 className="text-[12px] font-bold tracking-wider text-ink-muted uppercase">Keywords</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {article.keywords.map((k) => (
                  <li key={k} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-body">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {published && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-desk-surface px-4 py-3">
              <p className="text-[14px] text-ink-body">{voted ? "Thanks — your feedback was recorded." : "Was this article helpful?"}</p>
              {!voted && (
                <span className="flex gap-2">
                  {[true, false].map((helpful) => (
                    <button
                      key={String(helpful)}
                      type="button"
                      onClick={() => rate.mutate({ id: article.id, helpful }, { onSuccess: () => setVoted(true) })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink hover:border-desk hover:text-desk"
                    >
                      {helpful ? <ThumbsUpIcon size={15} aria-hidden /> : <ThumbsDownIcon size={15} aria-hidden />}
                      {helpful ? "Yes" : "No"}
                    </button>
                  ))}
                </span>
              )}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Panel title="Reach" bodyClassName="px-5 pb-5">
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: EyeIcon, label: "Views", value: article.views.toLocaleString("en-US") },
                { icon: ShareNetworkIcon, label: "In replies", value: article.uses },
                { icon: ThumbsUpIcon, label: "Helpful", value: votes ? `${Math.round((article.helpful / votes) * 100)}%` : "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-line-soft p-3">
                  <s.icon size={18} aria-hidden className="text-desk" />
                  <p className="mt-1 text-[20px] leading-7 font-bold text-ink tabular-nums">{s.value}</p>
                  <p className="text-[12px] text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-caption text-ink-muted">{votes ? `${votes} readers rated this article.` : "No ratings yet."}</p>
          </Panel>
          <Panel title="Related articles" bodyClassName="px-5 pb-4">
            {related.length ? (
              <ul className="divide-y divide-line-soft">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/knowledge/${r.id}`} className="block py-3 hover:text-desk">
                      <span className="block text-[14px] font-semibold text-ink">{r.title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{r.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pb-2 text-body text-ink-muted">No related articles yet.</p>
            )}
          </Panel>
        </div>
      </div>

      <ArticleDrawer key={drawer.key} open={drawer.open} onOpenChange={drawer.setOpen} article={article} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this article?"
        description={`“${article.title}” will be removed from Knowledge and can no longer be suggested in tickets. This can't be undone.`}
        confirmLabel="Delete article"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(article.id, {
            onSuccess: () => {
              toast.success("Article deleted", { description: article.title });
              router.push("/knowledge");
            },
          })
        }
      />
    </PageShell>
  );
}
