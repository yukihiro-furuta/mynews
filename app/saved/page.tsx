'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Article } from '../api/news/route';
import BottomNav from '@/components/BottomNav';
import ArticleCardCompact from '@/components/ArticleCardCompact';
import { loadSaved, removeSaved } from '@/lib/savedArticles';
import { loadAnalysisState, deleteAnalysis, type AnalysisEntry } from '@/lib/analysisHistory';
import { timeAgo } from '@/lib/timeAgo';

type Tab = 'articles' | 'analysis';
type CompareState = 'idle' | 'loading' | 'done' | 'error';
type WeeklyState = 'idle' | 'loading' | 'done' | 'error';

type CompareEntryPayload = {
  articleId: string;
  title: string;
  source: string;
  category: string;
  pubDate: string;
  analysis: string;
  contentHash: string;
};

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

  // 比較分析
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareState, setCompareState] = useState<CompareState>('idle');
  const [compareResult, setCompareResult] = useState('');
  const [compareError, setCompareError] = useState('');
  const isComparingRef = useRef(false);

  // 週間分析
  const [weeklyState, setWeeklyState] = useState<WeeklyState>('idle');
  const [weeklyResult, setWeeklyResult] = useState('');
  const [weeklyError, setWeeklyError] = useState('');
  const [weeklyMeta, setWeeklyMeta] = useState<{ start: string; end: string; count: number } | null>(null);
  const isWeeklyRunningRef = useRef(false);

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
    // 比較モード中に削除された場合、選択から除外
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(articleId);
      return next;
    });
  }

  function toggleExpand(articleId: string) {
    setExpandedId((prev) => (prev === articleId ? null : articleId));
  }

  // 比較モード切り替え
  function toggleCompareMode() {
    setCompareMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }

  // 比較対象の選択/解除
  function toggleSelection(articleId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else if (next.size < 5) {
        next.add(articleId);
      }
      return next;
    });
  }

  // 比較分析実行
  async function handleCompare() {
    if (isComparingRef.current || selectedIds.size < 2) return;
    isComparingRef.current = true;
    setCompareState('loading');
    setCompareError('');

    try {
      const selected = analysisHistory.filter(e => selectedIds.has(e.articleId));
      const payload: CompareEntryPayload[] = selected.map(e => ({
        articleId: e.articleId,
        title: e.title.slice(0, 200),
        source: e.source,
        category: e.category,
        pubDate: e.pubDate,
        analysis: e.analysis.slice(0, 1200),
        contentHash: e.contentHash,
      }));

      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: payload }),
      });
      const data = await res.json() as { comparison?: string; error?: string };
      if (!res.ok) {
        setCompareError(data.error ?? 'エラーが発生しました');
        setCompareState('error');
        return;
      }
      setCompareResult(data.comparison ?? '');
      setCompareState('done');
    } catch {
      setCompareError('ネットワークエラーが発生しました');
      setCompareState('error');
    } finally {
      isComparingRef.current = false;
    }
  }

  // 週間分析実行
  async function handleWeeklyAnalysis() {
    if (isWeeklyRunningRef.current) return;
    isWeeklyRunningRef.current = true;
    setWeeklyState('loading');
    setWeeklyError('');
    setWeeklyResult('');
    setWeeklyMeta(null);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // pubDate 基準でフィルタリング。日付不正な場合のみ savedAt にフォールバック
      const weeklyEntries = analysisHistory.filter(e => {
        const parsed = e.pubDate ? new Date(e.pubDate) : new Date(NaN);
        const date = !isNaN(parsed.getTime()) ? parsed : new Date(e.savedAt);
        return !isNaN(date.getTime()) && date >= sevenDaysAgo;
      });

      if (weeklyEntries.length === 0) {
        setWeeklyError('直近7日間に公開された記事の分析履歴が見つかりませんでした');
        setWeeklyState('error');
        return;
      }

      // 20件超は savedAt 降順（loadAnalysisState は既にこの順）で最新20件に絞る
      const limited = weeklyEntries.slice(0, 20);

      const startLabel = sevenDaysAgo.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      const endLabel = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

      const payload = {
        entries: limited.map(e => ({
          articleId: e.articleId,
          title: e.title.slice(0, 150),
          source: e.source,
          category: e.category,
          pubDate: e.pubDate,
          analysis: e.analysis.slice(0, 600),
          contentHash: e.contentHash,
        })),
        periodStart: sevenDaysAgo.toISOString(),
        periodEnd: now.toISOString(),
      };

      const res = await fetch('/api/ai/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { weekly?: string; error?: string };
      if (!res.ok) {
        setWeeklyError(data.error ?? 'エラーが発生しました');
        setWeeklyState('error');
        return;
      }
      setWeeklyResult(data.weekly ?? '');
      setWeeklyMeta({ start: startLabel, end: endLabel, count: limited.length });
      setWeeklyState('done');
    } catch {
      setWeeklyError('ネットワークエラーが発生しました');
      setWeeklyState('error');
    } finally {
      isWeeklyRunningRef.current = false;
    }
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
              <>
                {/* ── ツールバー ── */}
                <div className="px-4 pt-4 flex flex-wrap gap-2">
                  <button
                    onClick={toggleCompareMode}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                      compareMode
                        ? 'bg-amber-950/50 border-amber-700/60 text-amber-400'
                        : 'border-border text-text-muted hover:text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="9" height="18" rx="1" />
                      <rect x="13" y="3" width="9" height="18" rx="1" />
                    </svg>
                    {compareMode ? '比較モードを終了' : '比較分析'}
                  </button>
                  <button
                    onClick={() => void handleWeeklyAnalysis()}
                    disabled={weeklyState === 'loading'}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {weeklyState === 'loading' ? (
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    )}
                    {weeklyState === 'loading' ? '分析中...' : '週間分析'}
                  </button>
                </div>

                {/* ── 比較モード情報バー ── */}
                {compareMode && (
                  <div className="mx-4 mt-3 rounded-xl bg-amber-950/30 border border-amber-800/40 px-4 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-amber-400/90">
                      {selectedIds.size === 0
                        ? '比較したい記事を選択（2〜5件）'
                        : selectedIds.size < 2
                        ? `${selectedIds.size}件選択中（あと${2 - selectedIds.size}件以上選択してください）`
                        : `${selectedIds.size}件選択中`}
                    </p>
                    <button
                      onClick={() => void handleCompare()}
                      disabled={selectedIds.size < 2 || compareState === 'loading'}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-lg transition-colors"
                    >
                      {compareState === 'loading' ? (
                        <>
                          <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          分析中
                        </>
                      ) : (
                        `比較する（${selectedIds.size}件）`
                      )}
                    </button>
                  </div>
                )}

                {/* ── 比較分析結果 ── */}
                {(compareState === 'done' || compareState === 'error') && (
                  <div className="mx-4 mt-3 rounded-2xl bg-surface-card border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
                          <rect x="2" y="3" width="9" height="18" rx="1" />
                          <rect x="13" y="3" width="9" height="18" rx="1" />
                        </svg>
                        <span className="text-xs font-semibold text-text-secondary tracking-wide">
                          比較分析結果
                        </span>
                      </div>
                      <button
                        onClick={() => { setCompareState('idle'); setCompareResult(''); setCompareError(''); }}
                        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                        aria-label="閉じる"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-4 py-4">
                      {compareState === 'done' && (
                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                          {compareResult}
                        </div>
                      )}
                      {compareState === 'error' && (
                        <div className="space-y-3">
                          <p className="text-sm text-red-400">{compareError}</p>
                          <button
                            onClick={() => void handleCompare()}
                            disabled={selectedIds.size < 2}
                            className="text-xs text-text-muted border border-border rounded-xl px-3 py-1.5 hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
                          >
                            再試行する
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 週間分析結果 ── */}
                {(weeklyState === 'done' || weeklyState === 'error') && (
                  <div className="mx-4 mt-3 rounded-2xl bg-surface-card border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 flex-shrink-0">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="text-xs font-semibold text-text-secondary tracking-wide">
                          週間分析
                          {weeklyMeta && (
                            <span className="text-text-muted font-normal ml-1">
                              {weeklyMeta.start}〜{weeklyMeta.end}（{weeklyMeta.count}件）
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => { setWeeklyState('idle'); setWeeklyResult(''); setWeeklyError(''); setWeeklyMeta(null); }}
                        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                        aria-label="閉じる"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-4 py-4">
                      {weeklyState === 'done' && (
                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                          {weeklyResult}
                        </div>
                      )}
                      {weeklyState === 'error' && (
                        <div className="space-y-3">
                          <p className="text-sm text-red-400">{weeklyError}</p>
                          <button
                            onClick={() => void handleWeeklyAnalysis()}
                            className="text-xs text-text-muted border border-border rounded-xl px-3 py-1.5 hover:text-text-primary hover:border-text-muted transition-colors"
                          >
                            再試行する
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 履歴カードリスト ── */}
                <div className="px-4 pt-4 space-y-3">
                  {analysisHistory.map((entry) => (
                    <div
                      key={entry.articleId}
                      className={`rounded-2xl bg-surface-card border overflow-hidden transition-colors ${
                        compareMode && selectedIds.has(entry.articleId)
                          ? 'border-amber-500/60'
                          : 'border-border'
                      }`}
                    >
                      {/* 比較モード: チェックボックス行 */}
                      {compareMode && (
                        <button
                          onClick={() => toggleSelection(entry.articleId)}
                          disabled={!selectedIds.has(entry.articleId) && selectedIds.size >= 5}
                          className="w-full px-4 pt-3 pb-0 flex items-center gap-3 text-left disabled:opacity-40"
                          aria-label={selectedIds.has(entry.articleId) ? '選択を解除' : '比較対象に追加'}
                        >
                          <div
                            className={`flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedIds.has(entry.articleId)
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-border bg-surface-base'
                            }`}
                            style={{ width: '18px', height: '18px' }}
                          >
                            {selectedIds.has(entry.articleId) && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {selectedIds.has(entry.articleId) ? '選択済み' : '比較対象に追加'}
                          </span>
                        </button>
                      )}

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
              </>
            )}
          </>
        )}

      </div>

      <BottomNav current="saved" savedCount={saved.length} />
    </main>
  );
}
