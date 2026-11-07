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

function NewsPlaceholder() {
  return (
    <div className="w-full h-44 bg-surface-raised flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-text-muted">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    </div>
  );
}

function BookmarkBtn({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
    </svg>
  );
}

export default function ArticleCard({ article, isSaved = false, onToggleSave }: Props) {
  return (
    <div className="bg-surface-card rounded-2xl overflow-hidden border border-border hover:border-text-muted transition-colors">

      {/* Hero image */}
      <Link href={`/article/${article.id}`} className="block relative">
        {article.image ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image}
              alt=""
              className="w-full h-52 object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.parentElement!.replaceWith(
                  Object.assign(document.createElement('div'), {
                    className: 'w-full h-44 bg-surface-raised',
                  })
                );
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-card/60 via-transparent to-transparent" />
          </div>
        ) : (
          <NewsPlaceholder />
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <CategoryBadge category={article.category} label={article.categoryLabel} />
            </div>
            <Link
              href={`/article/${article.id}`}
              className="block text-sm font-semibold text-text-primary leading-snug mb-2 hover:text-accent-blue transition-colors line-clamp-3"
            >
              {article.title}
            </Link>
            <p className="text-xs text-text-secondary">
              {article.source} · {timeAgo(article.pubDate)}
            </p>
          </div>

          {onToggleSave && (
            <button
              onClick={() => onToggleSave(article)}
              className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg transition-colors active:scale-90 ${
                isSaved ? 'text-accent-blue hover:text-blue-300' : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-label={isSaved ? '保存を解除' : '保存する'}
            >
              <BookmarkBtn filled={isSaved} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
