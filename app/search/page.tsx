'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Article } from '../api/news/route';
import BottomNav from '@/components/BottomNav';
import ArticleCardCompact from '@/components/ArticleCardCompact';
import { FILTERS } from '@/lib/categoryStyles';
import { loadSaved, toggleSaved } from '@/lib/savedArticles';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  eco: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  startup: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" />
      <path d="M12 2c2.5 2.5 4 6 4 10" />
      <path d="M22 2l-10 10" />
      <path d="M15 2h7v7" />
    </svg>
  ),
  shizuoka: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  nagano: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  agri: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 7 7 4 3 5c0 4 3 8 9 7z" />
      <path d="M12 12c0-5 5-8 9-7 0 4-3 8-9 7z" />
    </svg>
  ),
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  eco: '経済',
  startup: 'スタートアップ',
  shizuoka: '静岡',
  nagano: '長野',
  agri: '農業',
};

const CATEGORY_ACCENT: Record<string, string> = {
  all:      'text-blue-400 bg-blue-950/70 border-blue-700/60',
  eco:      'text-yellow-400 bg-yellow-950/70 border-yellow-700/60',
  startup:  'text-purple-400 bg-purple-950/70 border-purple-700/60',
  shizuoka: 'text-teal-400 bg-teal-950/70 border-teal-700/60',
  nagano:   'text-teal-300 bg-teal-950/70 border-teal-700/60',
  agri:     'text-green-400 bg-green-950/70 border-green-700/60',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <main className="min-h-screen bg-surface-base text-text-primary pb-28">
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-text-primary leading-tight">Search</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="h-11 bg-surface-card border border-border rounded-2xl" />
      </div>
    </main>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('invalid response');
        setAllArticles(data as Article[]);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setSavedIds(new Set(loadSaved().map((a) => a.id)));
  }, []);

  function handleToggleSave(article: Article) {
    const next = toggleSaved(article);
    setSavedIds(new Set(next.map((a) => a.id)));
  }

  const q = query.trim().toLowerCase();
  const filtered = allArticles.filter((a) => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.source.toLowerCase().includes(q) ||
      a.categoryLabel.toLowerCase().includes(q)
    );
  });

  const isSearching = q.length > 0;

  return (
    <main className="min-h-screen bg-surface-base text-text-primary pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-text-primary leading-tight">
            Search
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">

        {/* Search bar */}
        <div className="px-4 pt-4 pb-3">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5L21 21" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードで検索..."
              autoFocus={!!initialQuery}
              className="w-full bg-surface-card border border-border rounded-2xl pl-10 pr-10 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
            {query.length > 0 && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                aria-label="クリア"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category grid */}
        {!isSearching && (
          <section className="px-4 pb-4">
            <p className="text-xs text-text-muted font-medium mb-3 tracking-wide uppercase">カテゴリ</p>
            <div className="grid grid-cols-3 gap-2">
              {FILTERS.map((f) => {
                const isActive = activeCategory === f.key;
                const accent = CATEGORY_ACCENT[f.key] ?? 'text-gray-400 bg-gray-900 border-gray-800';
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveCategory(f.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all text-xs font-medium ${
                      isActive
                        ? `${accent} ring-1 ring-inset ${accent.includes('blue') ? 'ring-blue-600' : accent.includes('yellow') ? 'ring-yellow-600' : accent.includes('purple') ? 'ring-purple-600' : accent.includes('teal') ? 'ring-teal-600' : 'ring-green-600'}`
                        : 'bg-surface-card text-text-muted border-border hover:text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    <span className={isActive ? '' : 'opacity-50'}>
                      {CATEGORY_ICONS[f.key]}
                    </span>
                    {CATEGORY_LABELS[f.key]}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Results header */}
        {(isSearching || activeCategory !== 'all') && !loading && !error && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {filtered.length}件の結果
              {isSearching && <span className="ml-1 text-text-primary font-medium">&ldquo;{query.trim()}&rdquo;</span>}
            </p>
            {activeCategory !== 'all' && (
              <button
                onClick={() => setActiveCategory('all')}
                className="text-xs text-accent-blue hover:text-blue-300 transition-colors"
              >
                絞り込みを解除
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-center text-text-muted text-sm py-16">読み込み中...</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-red-400 text-sm py-16">取得に失敗しました。</p>
        )}

        {/* Article list */}
        {!loading && !error && (isSearching || activeCategory !== 'all') && (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5L21 21" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">記事が見つかりません</p>
              <p className="text-xs text-text-muted">別のキーワードやカテゴリをお試しください</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-4">
              {filtered.map((article) => (
                <ArticleCardCompact
                  key={article.id}
                  article={article}
                  isSaved={savedIds.has(article.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )
        )}

        {/* Initial state: no search, all categories */}
        {!loading && !error && !isSearching && activeCategory === 'all' && (
          <div className="px-4 pt-2 pb-4">
            <p className="text-xs text-text-muted font-medium mb-3 tracking-wide uppercase">最新記事</p>
            <div className="space-y-3">
              {allArticles.slice(0, 10).map((article) => (
                <ArticleCardCompact
                  key={article.id}
                  article={article}
                  isSaved={savedIds.has(article.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      <BottomNav current="search" savedCount={savedIds.size} />
    </main>
  );
}
