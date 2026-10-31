'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '../api/news/route';

const CAT_STYLE: Record<
  Article['category'],
  { bg: string; text: string; border: string; left: string }
> = {
  eco:      { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-700/40', left: 'border-l-yellow-500' },
  startup:  { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-700/40', left: 'border-l-purple-500' },
  shizuoka: { bg: 'bg-teal-950/60',   text: 'text-teal-400',   border: 'border-teal-700/40',   left: 'border-l-teal-500' },
  nagano:   { bg: 'bg-teal-950/60',   text: 'text-teal-400',   border: 'border-teal-700/40',   left: 'border-l-teal-400' },
  agri:     { bg: 'bg-green-950/60',  text: 'text-green-400',  border: 'border-green-700/40',  left: 'border-l-green-500' },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return '1時間以内';
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function SavedPage() {
  const [saved, setSaved] = useState<Article[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem('saved_articles');
      if (data) setSaved(JSON.parse(data));
    } catch {
      // localStorageが使えない環境では空のまま
    }
  }, []);

  function remove(id: string) {
    const next = saved.filter((a) => a.id !== id);
    setSaved(next);
    localStorage.setItem('saved_articles', JSON.stringify(next));
  }

  function clearAll() {
    if (!confirm('保存した記事をすべて削除しますか？')) return;
    setSaved([]);
    localStorage.removeItem('saved_articles');
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">

      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-yellow-400">⭐ 保存済み</h1>
        {saved.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            すべて削除
          </button>
        )}
      </header>

      {/* 記事一覧 */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {saved.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">⭐</p>
            <p className="text-gray-400 text-sm">保存した記事はありません</p>
            <p className="text-gray-600 text-xs mt-2">
              記事カードの ⭐ ボタンで保存できます
            </p>
            <Link
              href="/"
              className="inline-block mt-6 px-4 py-2 bg-blue-600 rounded-full text-sm text-white"
            >
              ニュースを見る
            </Link>
          </div>
        )}

        {saved.map((article) => {
          const s = CAT_STYLE[article.category];
          return (
            <div
              key={article.id}
              className={`bg-gray-900 border border-l-4 rounded-xl overflow-hidden ${s.border} ${s.left}`}
            >
              {article.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.image}
                  alt=""
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${s.bg} ${s.text} ${s.border}`}
                    >
                      {article.categoryLabel}
                    </span>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-semibold leading-snug mb-1.5 hover:text-blue-400 transition-colors"
                    >
                      {article.title}
                    </a>
                    <p className="text-xs text-gray-500">
                      {timeAgo(article.pubDate)} · {article.source}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(article.id)}
                    className="text-yellow-400 text-lg flex-shrink-0 hover:text-gray-500 transition-colors"
                    aria-label="保存を解除"
                  >
                    ⭐
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ボトムナビ */}
      <BottomNav current="saved" />
    </main>
  );
}

function BottomNav({ current }: { current: 'home' | 'saved' }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
      <Link
        href="/"
        className={`flex-1 py-3 flex flex-col items-center text-xs transition-colors ${
          current === 'home' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <span className="text-lg">🏠</span>
        ホーム
      </Link>
      <Link
        href="/saved"
        className={`flex-1 py-3 flex flex-col items-center text-xs transition-colors ${
          current === 'saved' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <span className="text-lg">⭐</span>
        保存済み
      </Link>
    </nav>
  );
}
