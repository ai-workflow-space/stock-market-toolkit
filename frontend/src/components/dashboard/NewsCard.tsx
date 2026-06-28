import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink } from "lucide-react";
import type { NewsData } from "@/types";

function formatRelativeTime(unixTs: number): string {
  const now = Date.now() / 1000;
  const diff = now - unixTs;
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return m <= 1 ? "just now" : m + "m ago";
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return h + "h ago";
  }
  const d = Math.floor(diff / 86400);
  return d + "d ago";
}

function formatAbsolute(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

interface NewsCardProps {
  news: NewsData | null;
  loading: boolean;
}

export default function NewsCard({ news, loading }: NewsCardProps) {
  if (loading) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="px-5 pb-3 pt-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Newspaper className="h-4 w-4" />
            Recent News
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-0 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const articles = news?.articles ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="px-5 pb-3 pt-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Newspaper className="h-4 w-4" />
          Recent News
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0 flex-1 overflow-auto">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
            <Newspaper className="mb-2 h-6 w-6 opacity-40" />
            No recent news
          </div>
        ) : (
          <ul className="space-y-3">
            {articles.slice(0, 5).map((article, i) => (
              <li key={i} className="group">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-medium leading-snug group-hover:underline"
                >
                  <span className="flex items-start gap-1">
                    <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-50" />
                    {article.title}
                  </span>
                </a>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {article.publisher && <span>{article.publisher}</span>}
                  {article.publisher && article.publishedAt && <span>·</span>}
                  {article.publishedAt && (
                    <span title={formatAbsolute(article.publishedAt)}>
                      {formatRelativeTime(article.publishedAt)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}