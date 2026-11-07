import Link from 'next/link';
import type { ReactNode } from 'react';

export type BottomNavTab = 'home' | 'search' | 'browse' | 'saved' | 'chat' | 'profile';

interface Props {
  current: BottomNavTab;
  savedCount?: number;
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" />
      <path d="M9 22V14h6v8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

interface TabDef {
  key: BottomNavTab;
  href: string;
  label: string;
  renderIcon: (active: boolean) => ReactNode;
}

const TABS: TabDef[] = [
  { key: 'home',    href: '/',        label: 'ホーム',   renderIcon: ()       => <HomeIcon /> },
  { key: 'search',  href: '/search',  label: '検索',     renderIcon: ()       => <SearchIcon /> },
  { key: 'browse',  href: '/browse',  label: 'ブラウズ', renderIcon: ()       => <BrowseIcon /> },
  { key: 'saved',   href: '/saved',   label: '保存',     renderIcon: (active) => <BookmarkIcon filled={active} /> },
  { key: 'chat',    href: '/chat',    label: 'AI',       renderIcon: ()       => <ChatIcon /> },
  { key: 'profile', href: '/profile', label: '設定',     renderIcon: ()       => <ProfileIcon /> },
];

export default function BottomNav({ current, savedCount }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-base/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-2xl mx-auto flex">
        {TABS.map(({ key, href, label, renderIcon }) => {
          const isActive = current === key;
          return (
            <Link
              key={key}
              href={href}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-[9px] font-medium transition-colors relative ${
                isActive ? 'text-accent-blue' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {renderIcon(isActive)}
              <span>{label}</span>
              {key === 'saved' && savedCount !== undefined && savedCount > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+8px)] bg-accent-blue text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {savedCount > 9 ? '9+' : savedCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
