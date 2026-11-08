'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '../api/news/route';
import BottomNav from '@/components/BottomNav';
import ArticleCardCompact from '@/components/ArticleCardCompact';
import { loadSaved, removeSaved } from '@/lib/savedArticles';
import { loadAnalysisState, deleteAnalysis, type AnalysisEntry } from '@/lib/analysisHistory';
import { timeAgo } from '@/lib/timeAgo';

type Tab = 'articles' | 'analysis';

const CATEGORY_LABELS: Record<string, string> = {
  eco: '💹 経済',
  startup: '🚀 スタートアップ',
  shizuoka: '📍 静岡',
  nagano: '📍 長野',
  agri: '🌾 農業',
};

export default function SavedPage() {
  const [saved, setSaved] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('articles');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [analysisLoadError, setAnalysisLoadError] = useState<'parse_error' | 'access_error' | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
    const r = loadAnalysisState();
    setAnalysisHistory(r.ok ? r.entries : []);
    setAnalysisLoadError(r.ok ? null : r.reason);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'saved_articles') setSaved(loadSaved());
      if (e.key === 'analysis_history') {
        const r = loadAnalysisState();
        setAnalysisHistory(r.ok ? r.entries : []);
        setAnalysisLoadError(r.ok ? null : r.reason);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleRemove(article: Article) {
    const next = removeSaved(article.id);
    setSaved(next);
  }

  function handleDeleteAnalysis(articleId: string) {
    if (confirmDeleteId !== articleId) {
      setConfirmDeleteId(articleId);
      return;
    }
    deleteAnalysis(articleId);
    const r = loadAnalysisState();
    setAnalysisHistory(r.ok ? r.entries : []);
    setAnalysisLoadError(r.ok ? null : r.reason);
    setConfirmDeleteId(null);
    if (expandedId === articleId) setExpandedId(null);
  }

  function toggleExpand(articleId: string) {
    setExpandedId((prev) => (prev === articleId ? null : articleId));
  }

  const headerCount =
    activeTab === 'articles'
      ? `${saved.length}件の保存済み記事`
      : `${analysisHistory.length}件のAI分析`;

  return (
    <main className="min-h-screen bg-surface-base text-text-primary pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-text-primary leading-tight">Saved</h1>
          <p className="text-xs text-text-muted">{headerCount}</p>
        </div>

        {/* Tab nav */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 border-t border-border-subtle">
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'articles'
                ? 'border-accent-blue text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            保存記事
            {saved.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{saved.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-accent-blue text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            AI分析履歴
            {analysisHistory.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{analysisHistory.length}</span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">

        {/* ── 保存記事タブ ── */}
        {activeTab === 'articles' && (
          <>
            {saved.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-5">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-text-muted"
                  >
                    <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-text-primary mb-2">No saved articles yet</p>
                <p className="text-sm text-text-muted mb-6">
                  気になるニュースを保存すると、ここに表示されます
                </p>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-full transition-colors"
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
          </>
        )}

        {/* ── AI分析履歴タブ ── */}
        {activeTab === 'analysis' && (
          <>
            {analysisLoadError && (
              <div className="mx-4 mt-4 rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3">
                <p className="text-sm text-red-400">
                  {analysisLoadError === 'parse_error'
                    ? '分析履歴データが破損しています。読み込みに失敗しました。'
                    : 'ストレージへのアクセスに失敗しました。'}
                </p>
              </div>
            )}
            {analysisHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-5">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-text-muted"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-text-primary mb-2">AI分析履歴がありません</p>
                <p className="text-sm text-text-muted mb-6">
                  記事詳細でAI詳細分析を実行し、「分析結果を保存」を押すとここに表示されます
                </p>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-full transition-colors"
                >
                  ニュースを見る
                </Link>
              </div>
            ) : (
              <div className="px-4 pt-4 space-y-3">
                {analysisHistory.map((entry) => (
                  <div
                    key={entry.articleId}
                    className="rounded-2xl bg-surface-card border border-border overflow-hidden"
                  >
                    {/* Card info */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-text-muted">
                          {CATEGORY_LABELS[entry.category] ?? entry.category}
                        </span>
                        <span className="text-text-muted">·</span>
                        <span className="text-xs font-medium text-text-secondary">{entry.source}</span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary leading-snug mb-2">
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span>記事：{timeAgo(entry.pubDate)}</span>
                        <span>·</span>
                        <span>保存：{timeAgo(entry.savedAt)}</span>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="px-4 pb-3 flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleExpand(entry.articleId)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform ${expandedId === entry.articleId ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        {expandedId === entry.articleId ? '分析を閉じる' : '分析を読む'}
                      </button>

                      {confirmDeleteId === entry.articleId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">削除しますか？</span>
                          <button
                            onClick={() => handleDeleteAnalysis(entry.articleId)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg border border-red-800/50 transition-colors"
                          >
                            削除
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 rounded-lg border border-border transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteAnalysis(entry.articleId)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-950/20 transition-colors"
                          aria-label="削除"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Expanded analysis */}
                    {expandedId === entry.articleId && (
                      <div className="border-t border-border px-4 pb-5 pt-4">
                        <p className="text-xs text-amber-400/80 leading-relaxed mb-3">
                          ※ 保存時のAI詳細分析です。タイトルとRSS概要に基づく分析のため、記事全文を反映していません。
                        </p>
                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                          {entry.analysis}
                        </div>
                        {entry.link && entry.link !== '#' && (
                          <a
                            href={entry.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-blue hover:text-blue-300 transition-colors"
                          >
                            元記事を読む
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <BottomNav current="saved" savedCount={saved.length} />
    </main>
  );
}
