/**
 * Mock knowledge base API. Articles live in the same list the ticket
 * workspace suggests from, so publishing an article here makes it
 * available to agents in replies straight away (drafts never are).
 */
import { AGENTS, CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import { KNOWLEDGE_ARTICLES, type ArticleStatus, type KnowledgeArticle, type KnowledgeCategory } from "@/lib/mock-data/knowledge";
import { NotFoundError } from "@/lib/api/tickets";
import { articleInputSchema, type ArticleInput } from "@/lib/schemas/desk";
import type { Agent } from "@/lib/types/ticket";

const delay = (ms = 90 + Math.random() * 120) => new Promise((r) => setTimeout(r, ms));

export const ARTICLE_SORTS = ["updated_desc", "views_desc", "uses_desc", "title_asc"] as const;
export type ArticleSort = (typeof ARTICLE_SORTS)[number];

export interface ArticleQuery {
  q: string;
  category: KnowledgeCategory | "";
  status: ArticleStatus | "";
  sort: ArticleSort;
}

export interface ArticleView extends KnowledgeArticle {
  author: Agent;
}

const view = (a: KnowledgeArticle): ArticleView => ({ ...a, author: AGENTS.find((x) => x.id === a.authorId) ?? AGENTS[0] });

const SORTERS: Record<ArticleSort, (a: KnowledgeArticle, b: KnowledgeArticle) => number> = {
  updated_desc: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  views_desc: (a, b) => b.views - a.views,
  uses_desc: (a, b) => b.uses - a.uses,
  title_asc: (a, b) => a.title.localeCompare(b.title),
};

export interface ArticleList {
  items: ArticleView[];
  /** Unfiltered totals, for the KPI tiles and category counts. */
  stats: { published: number; drafts: number; views: number; helpfulRate: number | null; byCategory: Record<string, number> };
}

export async function listArticles(query: ArticleQuery): Promise<ArticleList> {
  await delay();
  const term = query.q.trim().toLowerCase();
  const items = KNOWLEDGE_ARTICLES.filter((a) => !term || [a.title, a.summary, a.body, ...a.keywords].join(" ").toLowerCase().includes(term))
    .filter((a) => !query.category || a.category === query.category)
    .filter((a) => !query.status || a.status === query.status)
    .sort(SORTERS[query.sort])
    .map(view);
  const votes = KNOWLEDGE_ARTICLES.reduce((n, a) => n + a.helpful + a.notHelpful, 0);
  const helpful = KNOWLEDGE_ARTICLES.reduce((n, a) => n + a.helpful, 0);
  const byCategory: Record<string, number> = {};
  for (const a of KNOWLEDGE_ARTICLES) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
  return {
    items,
    stats: {
      published: KNOWLEDGE_ARTICLES.filter((a) => a.status === "published").length,
      drafts: KNOWLEDGE_ARTICLES.filter((a) => a.status === "draft").length,
      views: KNOWLEDGE_ARTICLES.reduce((n, a) => n + a.views, 0),
      helpfulRate: votes ? Math.round((helpful / votes) * 100) : null,
      byCategory,
    },
  };
}

export async function getArticle(id: string): Promise<{ article: ArticleView; related: ArticleView[] } | null> {
  await delay();
  const article = KNOWLEDGE_ARTICLES.find((a) => a.id === id);
  if (!article) return null;
  const related = KNOWLEDGE_ARTICLES.filter((a) => a.id !== id && a.status === "published")
    .map((a) => ({ a, score: (a.category === article.category ? 2 : 0) + a.keywords.filter((k) => article.keywords.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map((x) => view(x.a));
  return { article: view(article), related };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

export async function saveArticle(input: ArticleInput, id?: string): Promise<KnowledgeArticle> {
  const data = articleInputSchema.parse(input);
  await delay(200);
  const now = new Date().toISOString();
  if (id) {
    const article = KNOWLEDGE_ARTICLES.find((a) => a.id === id);
    if (!article) throw new NotFoundError("Article");
    Object.assign(article, data, { updatedAt: now });
    return article;
  }
  let key = slug(data.title) || "article";
  while (KNOWLEDGE_ARTICLES.some((a) => a.id === `kb-${key}`)) key = `${key}-2`;
  const article: KnowledgeArticle = {
    id: `kb-${key}`,
    ...data,
    url: `https://help.desk.example/articles/${key}`,
    uses: 0,
    authorId: CURRENT_AGENT_ID,
    views: 0,
    helpful: 0,
    notHelpful: 0,
    updatedAt: now,
  };
  KNOWLEDGE_ARTICLES.unshift(article);
  return article;
}

export async function setArticleStatus(id: string, status: ArticleStatus): Promise<KnowledgeArticle> {
  await delay(140);
  const article = KNOWLEDGE_ARTICLES.find((a) => a.id === id);
  if (!article) throw new NotFoundError("Article");
  article.status = status;
  article.updatedAt = new Date().toISOString();
  return article;
}

export async function deleteArticle(id: string): Promise<void> {
  await delay(140);
  const i = KNOWLEDGE_ARTICLES.findIndex((a) => a.id === id);
  if (i < 0) throw new NotFoundError("Article");
  KNOWLEDGE_ARTICLES.splice(i, 1);
}

/** A reader's vote from the article preview ("Was this helpful?"). */
export async function rateArticle(id: string, helpful: boolean): Promise<void> {
  await delay(80);
  const article = KNOWLEDGE_ARTICLES.find((a) => a.id === id);
  if (!article) throw new NotFoundError("Article");
  if (helpful) article.helpful += 1;
  else article.notHelpful += 1;
}
