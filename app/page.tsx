'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from './api/news/route';
import PushNotificationButton from '@/components/PushNotificationButton';

const CAT_STYLE: Record<
  Article['category'],
  { bg: string; text: string; border: string; left: string }
> = {
  eco:      { bg: 'bg-yellow-950/60',  text: 'text-yellow-400',  border: 'border-yellow-700/40',  left: 'border-l-yellow-500' },
  startup:  { bg: 'bg-purple-950/60',  text: 'text-purple-400',  border: 'border-purple-700/40',  left: 'border-l-purple-500' },
  shizuoka: { bg: 'bg-teal-950/60',    text: 'text-teal-400',    border: 'border-teal-700/40',    left: 'border-l-teal-500' },
  nagano:   { bg: 'bg-teal-950/60',    text: 'text-teal-400',    border: 'border-teal-700/40',    left: 'border-l-teal-400' },
  agri:     { bg: 'bg-green-950/60',   text: 'text-green-400',   border: 'border-green-700/40',   left: 'border-l-green-500' },
};

const FILTERS = [
  { key: 'all',      label: 'すべて' },
  { key: 'eco',      label: '💹 経済' },
  { key: 'startup',  label: '🚀 スタートアップ' },
  { key: 'shizuoka', label: '📍 静岡' },
  { key: 'nagano',   label: '📍 長野' },
  { key: 'agri',     label: '🌾 農業' },
];

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return '1時間以内';
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function loadSaved(): Article[] {
  try {
    return JSON.parse(localStorage.getItem('saved_articles') ?? '[]');
  } catch {
    return [];
  }
}

export default function Home() {
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [filter, setFilter]       = useState<string>('all');
  const [savedIds, setSavedIds]   = useState<Set<string>>(new Set());

  // ニュース取得
  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data: Article[]) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // 保存済みIDを読み込む
  useEffect(() => {
    const ids = new Set(loadSaved().map((a) => a.id));
    setSavedIds(ids);
  }, []);

  function toggleSave(article: Article) {
    const current = loadSaved();
    let next: Article[];
    if (savedIds.has(article.id)) {
      next = current.filter((a) => a.id !== article.id);
    } else {
      next = [article, ...current];
    }
    localStorage.setItem('saved_articles', JSON.stringify(next));
    setSavedIds(new Set(next.map((a) => a.id)));
  }

  const filtered =
    filter === 'all' ? articles : articles.filter((a) => a.category === filter);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20">

      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-400">📰 MyNews</h1>
        <div className="flex items-center gap-2">
          <PushNotificationButton />
          <span className="text-xs text-gray-500">
            {loading ? '取得中...' : `${filtered.length}件`}
          </span>
        </div>
      </header>

      {/* フィルタータブ */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-800 bg-gray-900 scrollbar-hide">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 記事一覧 */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {loading && (
          <p className="text-center text-gray-500 py-16">ニュースを読み込み中...</p>
        )}
        {error && (
          <p className="text-center text-red-400 py-16">取得に失敗しました。</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-16">記事がありません</p>
        )}

        {filtered.map((article) => {
          const s = CAT_STYLE[article.category];
          const isSaved = savedIds.has(article.id);
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
                  className="w-full h-44 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="p-3">
                <div className="flex items-start gap-2">
                  {/* 記事本文（リンク） */}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 hover:brightness-110 transition-all"
                  >
                    <span
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${s.bg} ${s.text} ${s.border}`}
                    >
                      {article.categoryLabel}
                    </span>
                    <p className="text-sm font-semibold leading-snug mb-1.5">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {timeAgo(article.pubDate)} · {article.source}
                    </p>
                  </a>
                  {/* 保存ボタン */}
                  <button
                    onClick={() => toggleSave(article)}
                    className={`text-xl flex-shrink-0 mt-0.5 transition-transform active:scale-75 ${
                      isSaved ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
                    }`}
                    aria-label={isSaved ? '保存を解除' : '保存する'}
                  >
                    {isSaved ? '⭐' : '☆'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ボトムナビ */}
      <BottomNav current="home" savedCount={savedIds.size} />
    </main>
  );
}

function BottomNav({
  current,
  savedCount,
}: {
  current: 'home' | 'saved';
  savedCount?: number;
}) {
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
        className={`flex-1 py-3 flex flex-col items-center text-xs transition-colors relative ${
          current === 'saved' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <span className="text-lg">⭐</span>
        保存済み
        {savedCount !== undefined && savedCount > 0 && (
          <span className="absolute top-2 right-[calc(50%-18px)] bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {savedCount > 9 ? '9+' : savedCount}
          </span>
        )}
      </Link>
    </nav>
  );
}
