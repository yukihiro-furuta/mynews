'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import PushNotificationButton from '@/components/PushNotificationButton';
import { loadSaved } from '@/lib/savedArticles';

function SettingRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 px-4">
      <div className="flex items-center gap-3">
        <span className="text-text-muted">{icon}</span>
        <span className="text-sm text-text-primary">{label}</span>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 px-4">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-muted">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setSavedCount(loadSaved().length);
  }, []);

  return (
    <main className="min-h-screen bg-surface-base text-text-primary pb-28">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-text-primary leading-tight">Profile</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* App identity */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h10M7 12h10M7 16h6" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-text-primary">MyNews</p>
            <p className="text-xs text-text-muted mt-0.5">Your personal news magazine.</p>
          </div>
        </div>

        {/* Notification settings */}
        <div>
          <p className="text-xs text-text-muted font-medium tracking-wide uppercase mb-2 px-1">通知設定</p>
          <SectionCard>
            <SettingRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              label="プッシュ通知"
            >
              <PushNotificationButton />
            </SettingRow>
            <div className="px-4 pb-3">
              <p className="text-xs text-text-muted leading-relaxed">
                通知を有効にすると、最新ニュースをプッシュ通知でお届けします。ブラウザの通知許可が必要です。
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Stats */}
        <div>
          <p className="text-xs text-text-muted font-medium tracking-wide uppercase mb-2 px-1">利用状況</p>
          <SectionCard>
            <InfoRow label="保存済み記事" value={`${savedCount}件`} />
          </SectionCard>
        </div>

        {/* About */}
        <div>
          <p className="text-xs text-text-muted font-medium tracking-wide uppercase mb-2 px-1">アプリ情報</p>
          <SectionCard>
            <InfoRow label="バージョン" value="1.0.0" />
            <div className="py-3.5 px-4">
              <p className="text-xs text-text-muted font-medium mb-1">ニュース取得元</p>
              <p className="text-xs text-text-muted leading-relaxed">
                ITmedia、SankeiBiz等のRSSフィードから経済・スタートアップ・静岡・長野・農業の記事を自動収集しています。各記事の著作権は原著作者に帰属します。
              </p>
            </div>
            <div className="py-3.5 px-4">
              <p className="text-xs text-text-muted font-medium mb-1">プライバシー</p>
              <p className="text-xs text-text-muted leading-relaxed">
                保存済み記事はお使いのデバイスのみに保存されます。プッシュ通知の購読情報はサーバーに保存されますが、個人を特定する情報は収集しません。
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Future features placeholder */}
        <div>
          <p className="text-xs text-text-muted font-medium tracking-wide uppercase mb-2 px-1">今後対応予定</p>
          <SectionCard>
            <SettingRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
                </svg>
              }
              label="カテゴリのカスタマイズ"
            >
              <span className="text-xs text-text-muted bg-surface-raised px-2 py-0.5 rounded-full">近日公開</span>
            </SettingRow>
            <SettingRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              }
              label="アカウント連携"
            >
              <span className="text-xs text-text-muted bg-surface-raised px-2 py-0.5 rounded-full">近日公開</span>
            </SettingRow>
          </SectionCard>
        </div>

      </div>

      <BottomNav current="profile" savedCount={savedCount} />
    </main>
  );
}
