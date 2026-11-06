'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { loadSaved } from '@/lib/savedArticles';

interface ComingSoonItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const COMING_SOON: ComingSoonItem[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    label: 'カテゴリ別ニュース',
    description: '経済・スタートアップ・農業など、テーマごとに記事を探せます',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
    label: '地域別ニュース',
    description: '静岡・長野など、地域ごとの最新ニュースをまとめて確認できます',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
    label: 'トピック購読',
    description: '気になるトピックをフォローして、関連記事を優先表示できます',
  },
];

export default function BrowsePage() {
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setSavedCount(loadSaved().length);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-100 pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-white leading-tight">Browse</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* Coming soon banner */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-700/40 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h10M7 12h10M7 16h6" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white mb-1">準備中</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              ニュースカテゴリーや地域別ニュースを探せる機能を準備しています
            </p>
          </div>
          <span className="text-xs text-blue-400 bg-blue-950/60 border border-blue-700/40 px-3 py-1 rounded-full">
            近日公開
          </span>
        </div>

        {/* Planned features */}
        <div>
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-2 px-1">追加予定の機能</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
            {COMING_SOON.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-4 px-4">
                <span className="text-gray-600 mt-0.5 flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm text-gray-200 font-medium mb-0.5">{item.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                </div>
                <span className="ml-auto flex-shrink-0 text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full self-start">近日</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav current="browse" savedCount={savedCount} />
    </main>
  );
}
