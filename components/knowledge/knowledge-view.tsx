"use client";

import Link from "next/link";
import { BookOpenIcon, EyeIcon, FileDashedIcon, FunnelSimpleIcon, PlusIcon, ShareNetworkIcon, ThumbsUpIcon } from "@phosphor-icons/react/dist/ssr";
import { FilterBar, FilterSelect, KpiRow, KpiTile, ListCard, PageShell, Pill, PrimaryButton, SearchBox, SecondaryButton } from "@/components/shared/desk-ui";
import { ModuleHeader, useDrawer } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { ListSkeleton } from "@/components/customers/customers-view";
import { useArticles } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import { ARTICLE_SORTS, type ArticleSort } from "@/lib/api/knowledge";
import { ARTICLE_STATUSES, KNOWLEDGE_CATEGORIES, type ArticleStatus, type KnowledgeCategory } from "@/lib/mock-data/knowledge";
import { cn } from "@/lib/utils";
import { ArticleDrawer } from "./article-drawer";

const SORT_LABEL: Record<ArticleSort, string> = { updated_desc: "Recently updated", views_desc: "Most viewed", uses_desc: "Most used in replies", title_asc: "Title A–Z" };
export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = { published: "Published", draft: "Draft" };

/** Knowledge base: the help-center articles agents suggest and link in replies. */
export function KnowledgeView() {
  const [state, setState] = useUrlState({ q: "", category: "", status: "", sort: "updated_desc" });
  const drawer = useDrawer();
  const hydrated = useHydrated();
  const sort = (ARTICLE_SORTS as readonly string[]).includes(state.sort) ? (state.sort as ArticleSort) : "updated_desc";
  const { data, isPending, isError, isPlaceholderData, refetch } = useArticles({
    q: state.q,
    category: state.category as KnowledgeCategory | "",
    status: state.status as ArticleStatus | "",
    sort,
  });
  const filtered = !!(state.q || state.category || state.status);

  return (
    <PageShell>
      <ModuleHeader
        title="Knowledge"
        subtitle="Help-center articles your team suggests and links in replies"
        actions={
          <PrimaryButton size="md" icon={PlusIcon} onClick={() => drawer.show()}>
            New article
          </PrimaryButton>
        }
      />

      {!hydrated || isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState title="Unable to load articles" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />
      ) : (
        <>
          <KpiRow cols="sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Published" value={data.stats.published} tone="desk" icon={BookOpenIcon} active={state.status === "published"} onClick={() => setState({ status: state.status === "published" ? "" : "published" })} />
            <KpiTile label="Drafts" value={data.stats.drafts} tone="amber" icon={FileDashedIcon} active={state.status === "draft"} onClick={() => setState({ status: state.status === "draft" ? "" : "draft" })} />
            <KpiTile label="Article views" value={data.stats.views.toLocaleString("en-US")} tone="blue" icon={EyeIcon} />
            <KpiTile label="Rated helpful" value={data.stats.helpfulRate === null ? "—" : `${data.stats.helpfulRate}%`} tone="purple" icon={ThumbsUpIcon} />
          </KpiRow>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Categories: a side list on desktop, a scrolling chip row on smaller screens. */}
            <nav aria-label="Categories" className="rounded-2xl border border-line-soft bg-card p-2 shadow-card">
              <ul className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                {[{ value: "", label: "All articles", count: Object.values(data.stats.byCategory).reduce((a, b) => a + b, 0) }, ...KNOWLEDGE_CATEGORIES.map((c) => ({ value: c, label: c, count: data.stats.byCategory[c] ?? 0 }))].map((c) => (
                  <li key={c.value} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setState({ category: c.value })}
                      aria-current={state.category === c.value ? "true" : undefined}
                      className={cn(
                        "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] whitespace-nowrap transition-colors",
                        state.category === c.value ? "bg-desk-10 font-medium text-desk" : "text-ink-body hover:bg-desk-depth-10 hover:text-ink",
                      )}
                    >
                      <span className="flex-1">{c.label}</span>
                      <span className="text-[13px] text-ink-muted tabular-nums">{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <ListCard className="space-y-3">
              <FilterBar activeCount={state.status ? 1 : 0} search={<SearchBox value={state.q} onChange={(q) => setState({ q })} placeholder="Search articles" className="sm:w-80" />}>
                <FilterSelect label="Status" value={state.status} placeholder="Any status" options={ARTICLE_STATUSES.map((s) => ({ value: s, label: ARTICLE_STATUS_LABEL[s] }))} onChange={(status) => setState({ status })} className="sm:w-40" />
                <FilterSelect
                  label="Sort"
                  value={sort === "updated_desc" ? "" : sort}
                  placeholder={SORT_LABEL.updated_desc}
                  options={ARTICLE_SORTS.filter((s) => s !== "updated_desc").map((s) => ({ value: s, label: SORT_LABEL[s] }))}
                  onChange={(v) => setState({ sort: v || "updated_desc" })}
                  className="sm:w-52"
                />
              </FilterBar>

              {data.items.length === 0 ? (
                <EmptyState
                  icon={filtered ? FunnelSimpleIcon : BookOpenIcon}
                  title={filtered ? "No articles match" : "No articles yet"}
                  hint={filtered ? "Try another search, category or status." : "Write the first article your team can link in replies."}
                  action={filtered ? <SecondaryButton onClick={() => setState({ q: "", category: "", status: "" })}>Clear filters</SecondaryButton> : undefined}
                />
              ) : (
                <ul className={cn("divide-y divide-line-soft border-t border-line transition-opacity", isPlaceholderData && "opacity-60")}>
                  {data.items.map((a) => (
                    <li key={a.id}>
                      <Link href={`/knowledge/${a.id}`} className="-mx-1 flex flex-col gap-2 rounded-xl px-1 py-4 transition-colors hover:bg-desk-surface sm:flex-row sm:items-start sm:gap-4 sm:px-3">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] leading-6 font-semibold text-ink">{a.title}</span>
                            {a.status === "draft" && (
                              <Pill tone="amber" className="px-2 py-0.5 text-[11px]">
                                Draft
                              </Pill>
                            )}
                          </span>
                          <span className="block text-[14px] leading-[21px] text-ink-muted">{a.summary}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                            <span className="rounded-md bg-desk-tint px-2 py-0.5 font-medium text-desk">{a.category}</span>
                            <span className="flex items-center gap-1.5">
                              <PersonAvatar name={a.author.name} src={a.author.avatar} size="xs" /> {a.author.name}
                            </span>
                            <span>
                              Updated <TimeLabel iso={a.updatedAt} />
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-4 text-[13px] text-ink-body sm:flex-col sm:items-end sm:gap-1">
                          <span className="flex items-center gap-1.5" title="Views">
                            <EyeIcon size={15} aria-hidden className="text-ink-muted" /> {a.views.toLocaleString("en-US")}
                            <span className="sr-only">views</span>
                          </span>
                          <span className="flex items-center gap-1.5" title="Linked in replies">
                            <ShareNetworkIcon size={15} aria-hidden className="text-ink-muted" /> {a.uses}
                            <span className="sr-only">uses in replies</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ListCard>
          </div>
        </>
      )}

      <ArticleDrawer key={drawer.key} open={drawer.open} onOpenChange={drawer.setOpen} />
    </PageShell>
  );
}
