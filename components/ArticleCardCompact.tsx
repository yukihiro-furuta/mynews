'use client';

import Link from 'next/link';
import type { Article } from '@/app/api/news/route';
import { timeAgo } from '@/lib/timeAgo';
import CategoryBadge from './CategoryBadge';

interface Props {
  article: Article;
  isSaved?: boolean;
  onToggleSave?: (article: Article) => void;
}

export default function ArticleCardCompact({ article, isSaved = false, onToggleSave }: Props) {
  return (
    <div className="bg-surface-card rounded-xl border border-border hover:border-text-muted transition-colors">
      <div className="flex items-start gap-3 p-3">

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <CategoryBadge category={article.category} label={article.categoryLabel} />
          </div>
          <Link
            href={`/article/${article.id}`}
            className="block text-sm font-semibold text-text-primary leading-snug mb-1.5 hover:text-accent-blue transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          <p className="text-xs text-text-secondary">
            {article.source} · {timeAgo(article.pubDate)}
          </p>
        </div>

        {/* Thumbnail + save button */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <div className="w-20 h-16 rounded-lg overflow-hidden bg-surface-raised flex items-center justify-center">
            {article.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-text-muted">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            )}
          </div>

          {onToggleSave && (
            <button
              onClick={() => onToggleSave(article)}
              className={`p-1 rounded-lg transition-colors active:scale-90 ${
                isSaved ? 'text-accent-blue hover:text-blue-300' : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-label={isSaved ? '保存を解除' : '保存する'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
              </svg>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
