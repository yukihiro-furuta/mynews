'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '../api/news/route';
import BottomNav from '@/components/BottomNav';
import ArticleCardCompact from '@/components/ArticleCardCompact';
import { loadSaved, removeSaved } from '@/lib/savedArticles';

export default function SavedPage() {
  const [saved, setSaved] = useState<Article[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'saved_articles') {
        setSaved(loadSaved());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleRemove(article: Article) {
    const next = removeSaved(article.id);
    setSaved(next);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-100 pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-white leading-tight">Saved</h1>
          <p className="text-xs text-gray-500">{saved.length}件の保存済み記事</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-white mb-2">No saved articles yet</p>
            <p className="text-sm text-gray-500 mb-6">
              気になるニュースを保存すると、ここに表示されます
            </p>
            <Link
              href="/"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-full transition-colors"
            >
              ニュースを見る
            </Link>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {saved.map((article) => (
              <ArticleCardCompact
                key={article.id}
                article={article}
                isSaved={true}
                onToggleSave={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav current="saved" savedCount={saved.length} />
    </main>
  );
}
