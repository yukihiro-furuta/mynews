'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Article } from './api/news/route';
import BottomNav from '@/components/BottomNav';
import ArticleCard from '@/components/ArticleCard';
import ArticleCardCompact from '@/components/ArticleCardCompact';
import PushNotificationButton from '@/components/PushNotificationButton';
import { FILTERS } from '@/lib/categoryStyles';
import { loadSaved, toggleSaved } from '@/lib/savedArticles';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 18) return 'Good Afternoon';
  if (h >= 18 && h < 22) return 'Good Evening';
  return 'Good Night';
}

function useGreeting(): string {
  const [greeting, setGreeting] = useState('');
  useEffect(() => { setGreeting(getGreeting()); }, []);
  return greeting;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="px-4 mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold text-white">
        <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-xs text-gray-500">{count}件</span>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const greeting = useGreeting();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/news')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('invalid response');
        setArticles(data as Article[]);
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hottestArticles = articles.slice(0, 5);
  const forYouArticles =
    filter === 'all' ? articles : articles.filter((a) => a.category === filter);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-100 pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium tracking-wide">{greeting}</p>
            <h1 className="text-lg font-bold text-white leading-tight">
              Your daily dose of <span className="text-blue-400">news.</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Link
              href="/saved"
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="保存済み記事"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={savedIds.size > 0 ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={savedIds.size > 0 ? 'text-blue-400' : ''}
              >
                <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
              </svg>
              {savedIds.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {savedIds.size > 9 ? '9+' : savedIds.size}
                </span>
              )}
            </Link>
            <PushNotificationButton />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">

        {/* Search bar */}
        <form onSubmit={handleSearch} className="px-4 pt-4 pb-2">
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5L21 21" />
              </svg>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for news..."
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <p className="text-center text-gray-500 text-sm py-16">ニュースを読み込み中...</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-red-400 text-sm py-16">取得に失敗しました。</p>
        )}

        {!loading && !error && (
          <>
            {/* Hottest News */}
            <section className="pt-5">
              <SectionHeader title="Hottest News" count={hottestArticles.length} />
              <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-3">
                {hottestArticles.map((article) => (
                  <div key={article.id} className="w-72 flex-shrink-0">
                    <ArticleCard
                      article={article}
                      isSaved={savedIds.has(article.id)}
                      onToggleSave={handleToggleSave}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Topics */}
            <section className="pt-4">
              <SectionHeader title="Topics" />
              <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-3">
                {FILTERS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors font-medium flex-shrink-0 ${
                      filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {/* For You */}
            <section className="pt-4">
              <SectionHeader title="For You" count={forYouArticles.length} />
              {forYouArticles.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8 px-4">記事がありません</p>
              ) : (
                <div className="px-4 space-y-3 pb-4">
                  {forYouArticles.map((article) => (
                    <ArticleCardCompact
                      key={article.id}
                      article={article}
                      isSaved={savedIds.has(article.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </div>

      <BottomNav current="home" savedCount={savedIds.size} />
    </main>
  );
}
