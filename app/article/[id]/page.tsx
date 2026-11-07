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

  type SummaryState = 'idle' | 'loading' | 'done' | 'error';
  const [summaryState, setSummaryState] = useState<SummaryState>('idle');
  const [summary, setSummary] = useState('');
  const [summaryError, setSummaryError] = useState('');

  type TranslateState = 'idle' | 'loading' | 'done' | 'error';
  const [translateState, setTranslateState] = useState<TranslateState>('idle');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedDescription, setTranslatedDescription] = useState('');
  const [translateError, setTranslateError] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

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

  async function handleTranslate() {
    if (!article || isTranslating) return;
    setIsTranslating(true);
    setTranslateState('loading');
    setTranslateError('');
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          source: article.source,
          title: article.title,
          description: article.description,
        }),
      });
      const data = await res.json() as { translatedTitle?: string; translatedDescription?: string; error?: string };
      if (!res.ok) {
        setTranslateError(data.error ?? 'エラーが発生しました');
        setTranslateState('error');
        return;
      }
      setTranslatedTitle(data.translatedTitle ?? '');
      setTranslatedDescription(data.translatedDescription ?? '');
      setTranslateState('done');
    } catch {
      setTranslateError('ネットワークエラーが発生しました');
      setTranslateState('error');
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSummarize() {
    if (!article) return;
    setSummaryState('loading');
    setSummaryError('');
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          title: article.title,
          description: article.description,
        }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      if (!res.ok) {
        setSummaryError(data.error ?? 'エラーが発生しました');
        setSummaryState('error');
        return;
      }
      setSummary(data.summary ?? '');
      setSummaryState('done');
    } catch {
      setSummaryError('ネットワークエラーが発生しました');
      setSummaryState('error');
    }
  }

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

              {/* AI Summary */}
              <div className="mb-6 rounded-2xl bg-surface-card border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue flex-shrink-0">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-xs font-semibold text-text-secondary tracking-wide">AI要約</span>
                </div>

                <div className="px-4 py-4">
                  {summaryState === 'idle' && (
                    <button
                      onClick={handleSummarize}
                      className="w-full py-3 text-sm font-medium text-accent-blue border border-blue-700/50 rounded-xl hover:bg-blue-950/40 active:bg-blue-950/70 transition-colors"
                    >
                      AIで要約する
                    </button>
                  )}

                  {summaryState === 'loading' && (
                    <div className="flex items-center justify-center gap-3 py-3">
                      <svg className="animate-spin text-accent-blue" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      <span className="text-sm text-text-muted">要約を生成中...</span>
                    </div>
                  )}

                  {summaryState === 'done' && (
                    <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {summary}
                    </div>
                  )}

                  {summaryState === 'error' && (
                    <div className="space-y-3">
                      <p className="text-sm text-red-400">{summaryError}</p>
                      <button
                        onClick={handleSummarize}
                        className="w-full py-2.5 text-sm font-medium text-text-muted border border-border rounded-xl hover:text-text-primary hover:border-text-muted transition-colors"
                      >
                        再試行する
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Translation — TechCrunch only */}
              {article.source === 'TechCrunch' && (
                <div className="mb-6 rounded-2xl bg-surface-card border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 flex-shrink-0">
                      <path d="M5 8l4 4 4-4M5 16l4-4 4 4" />
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    <span className="text-xs font-semibold text-text-secondary tracking-wide">日本語翻訳</span>
                  </div>

                  <div className="px-4 py-4">
                    {translateState === 'idle' && (
                      <button
                        onClick={handleTranslate}
                        className="w-full py-3 text-sm font-medium text-emerald-400 border border-emerald-700/50 rounded-xl hover:bg-emerald-950/40 active:bg-emerald-950/70 transition-colors"
                      >
                        日本語に翻訳する
                      </button>
                    )}

                    {translateState === 'loading' && (
                      <div className="flex items-center justify-center gap-3 py-3">
                        <svg className="animate-spin text-emerald-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                        <span className="text-sm text-text-muted">翻訳中...</span>
                      </div>
                    )}

                    {translateState === 'done' && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-text-primary leading-snug">
                          {translatedTitle}
                        </p>
                        {translatedDescription && (
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {translatedDescription}
                          </p>
                        )}
                        <p className="text-xs text-text-muted">※ タイトルと記事概要の翻訳です</p>
                      </div>
                    )}

                    {translateState === 'error' && (
                      <div className="space-y-3">
                        <p className="text-sm text-red-400">{translateError}</p>
                        <button
                          onClick={handleTranslate}
                          className="w-full py-2.5 text-sm font-medium text-text-muted border border-border rounded-xl hover:text-text-primary hover:border-text-muted transition-colors"
                        >
                          再試行する
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
