import type { Metadata } from "next";
import { ArticleView } from "@/components/knowledge/article-view";
import { KNOWLEDGE_ARTICLES } from "@/lib/mock-data/knowledge";

export async function generateMetadata({ params }: PageProps<"/knowledge/[articleId]">): Promise<Metadata> {
  const { articleId } = await params;
  return { title: KNOWLEDGE_ARTICLES.find((a) => a.id === articleId)?.title ?? "Article" };
}

export default async function ArticlePage({ params }: PageProps<"/knowledge/[articleId]">) {
  const { articleId } = await params;
  return <ArticleView articleId={decodeURIComponent(articleId)} />;
}
