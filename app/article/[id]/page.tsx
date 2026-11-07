'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Article } from '../../api/news/route';
import BottomNav from '@/components/BottomNav';
import CategoryBadge from '@/components/CategoryBadge';
import { loadSaved, toggleSaved } from '@/lib/savedArticles';
import { timeAgo } from '@/lib/timeAgo';

function pubDateFull(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ArticleDetailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center">
        <p className="text-text-muted text-sm">読み込み中...</p>
      </main>
    }>
      <ArticleDetailInner />
    </Suspense>
  );
}

function ArticleDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch('/api/news')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error();
        const found = (data as Article[]).find((a) => a.id === id);
        if (!found) {
          setNotFound(true);
        } else {
          setArticle(found);
          const saved = loadSaved();
          setIsSaved(saved.some((a) => a.id === found.id));
          setSavedCount(saved.length);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  function handleToggleSave() {
    if (!article) return;
    const next = toggleSaved(article);
    setIsSaved(next.some((a) => a.id === article.id));
    setSavedCount(next.length);
  }

  return (
    <main className="min-h-screen bg-surface-base text-text-primary pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-2 py-2 flex items-center gap-1">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="戻る"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm font-medium text-text-secondary truncate flex-1">記事詳細</span>
          {article && (
            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-xl transition-colors active:scale-90 ${
                isSaved ? 'text-accent-blue hover:text-blue-300' : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-label={isSaved ? '保存を解除' : '保存する'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <p className="text-text-muted text-sm">読み込み中...</p>
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            </div>
            <p className="text-base font-semibold text-text-primary mb-2">記事が見つかりません</p>
            <p className="text-sm text-text-muted mb-6">この記事はすでに削除されているか、URLが正しくない可能性があります。</p>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-full transition-colors"
            >
              ホームへ戻る
            </button>
          </div>
        )}

        {/* Article content */}
        {!loading && article && (
          <>
            {/* Hero image */}
            {article.image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.image}
                  alt=""
                  className="w-full max-h-64 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/20 to-transparent" />
              </div>
            ) : (
              <div className="w-full h-40 bg-surface-card flex items-center justify-center border-b border-border">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-text-muted">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                </svg>
              </div>
            )}

            {/* Body */}
            <div className="px-4 pt-4 pb-6">
              <div className="mb-3">
                <CategoryBadge category={article.category} label={article.categoryLabel} size="md" />
              </div>

              <h1 className="text-lg font-bold text-text-primary leading-snug mb-3">
                {article.title}
              </h1>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-text-secondary font-medium">{article.source}</span>
                <span className="text-text-muted">·</span>
                <span className="text-xs text-text-muted">{timeAgo(article.pubDate)}</span>
                <span className="text-text-muted">·</span>
                <span className="text-xs text-text-muted">{pubDateFull(article.pubDate)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-border mb-6" />

              {/* No body note */}
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                記事の全文は元のニュースサイトでお読みいただけます。
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col gap-3">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-accent-blue hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-2xl transition-colors"
                >
                  元記事を読む
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button
                  onClick={handleToggleSave}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold rounded-2xl border transition-colors ${
                    isSaved
                      ? 'bg-blue-950/70 border-blue-700/60 text-accent-blue hover:bg-blue-950'
                      : 'bg-surface-card border-border text-text-muted hover:text-text-primary hover:border-text-muted'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
                  </svg>
                  {isSaved ? '保存済み（タップして解除）' : '後で読む'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      <BottomNav current="home" savedCount={savedCount} />
    </main>
  );
}
