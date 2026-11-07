'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadConversations,
  saveConversation,
  appendMessage,
  updateConversation,
  getConversation,
  deleteConversation,
  type SavedMessage,
  type Conversation,
} from '@/lib/chatHistory';

async function generateAndSaveTitle(
  convId: string,
  userContent: string,
  assistantContent: string,
): Promise<void> {
  try {
    const res = await fetch('/api/ai/titlegen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: assistantContent },
        ],
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { title?: string };
    const raw = data.title ?? '';
    const title = Array.from(raw.trim()).slice(0, 30).join('');
    if (!title) return;
    updateConversation(convId, { title });
  } catch {
    // ベストエフォート: 失敗しても会話保存・チャットに影響しない
  }
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const MAX_CHARS = 500;
const MAX_SEND_MESSAGES = 10;
const MAX_AI_REPLY_CHARS = 5000;

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'こんにちは！AIアシスタントです。ニュース、テクノロジー、日常の疑問など、何でもお気軽にご質問ください。',
};

function toSaveErrorMessage(reason: string): string {
  switch (reason) {
    case 'limit_reached': return '保存件数の上限に達しました。';
    case 'storage_full': return '保存容量が不足しています。';
    case 'unsupported_version': return '保存データの形式が対応していないため、履歴を保存できません。';
    default: return '';
  }
}

function formatRelativeDate(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (y === now.getFullYear()) return `${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore latest conversation from localStorage after mount
  useEffect(() => {
    const loaded = loadConversations();
    if (loaded.length > 0) {
      const latest = loaded[0];
      setConvId(latest.id);
      setMessages([INITIAL_MESSAGE, ...latest.messages]);
    }
    setConversations(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Returns the AI reply string on success, null on error
  async function callApi(apiMessages: ChatMessage[]): Promise<string | null> {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generalchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages.slice(-MAX_SEND_MESSAGES) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
        return null;
      }
      const reply = data.reply ?? '';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      return reply;
    } catch {
      setError('ネットワークエラーが発生しました');
      return null;
    } finally {
      setLoading(false);
    }
  }

  function buildApiMessages(allMessages: ChatMessage[]): ChatMessage[] {
    // Skip the initial assistant greeting; API needs to start with a user message
    const firstUserIdx = allMessages.findIndex((m) => m.role === 'user');
    if (firstUserIdx === -1) return [];
    return allMessages.slice(firstUserIdx);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading || trimmed.length > MAX_CHARS) return;

    const isFirstMessage = convId === null;

    const userMsg: SavedMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSaveError('');

    // Save user message and resolve the active conversation ID
    let activeConvId = convId;
    if (activeConvId === null) {
      // First message in a new conversation
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const result = saveConversation({
        id: newId,
        title: '新しいチャット',
        kind: 'general',
        messages: [userMsg],
        createdAt: now,
        updatedAt: now,
      });
      if (result.ok) {
        activeConvId = newId;
        setConvId(newId);
      } else {
        const msg = toSaveErrorMessage(result.reason);
        if (msg) setSaveError(msg);
      }
    } else {
      const result = appendMessage(activeConvId, userMsg);
      if (!result.ok) {
        const msg = toSaveErrorMessage(result.reason);
        if (msg) setSaveError(msg);
      }
    }

    const reply = await callApi(buildApiMessages(nextMessages));

    if (reply !== null && activeConvId !== null) {
      if (reply.length > MAX_AI_REPLY_CHARS) {
        setSaveError('AIの回答が長すぎるため保存できませんでした（5,000文字を超えています）。');
      } else {
        const result = appendMessage(activeConvId, { role: 'assistant', content: reply });
        if (!result.ok) {
          const msg = toSaveErrorMessage(result.reason);
          if (msg) setSaveError(msg);
        } else if (isFirstMessage) {
          void generateAndSaveTitle(activeConvId, trimmed, reply).then(() => {
            setConversations(loadConversations());
          });
        }
      }
    }

    setConversations(loadConversations());
  }

  function handleRetry() {
    if (loading || messages.length === 0) return;
    // Trim back to the last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const retryMessages = messages.slice(0, idx + 1);
    setMessages(retryMessages);
    setError('');
    setSaveError('');

    // User message is already saved; only save the AI reply on success
    void (async () => {
      const reply = await callApi(buildApiMessages(retryMessages));
      if (reply !== null && convId !== null) {
        if (reply.length > MAX_AI_REPLY_CHARS) {
          setSaveError('AIの回答が長すぎるため保存できませんでした（5,000文字を超えています）。');
        } else {
          const result = appendMessage(convId, { role: 'assistant', content: reply });
          if (!result.ok) {
            const msg = toSaveErrorMessage(result.reason);
            if (msg) setSaveError(msg);
          }
        }
      }
    })();
  }

  function handleReset() {
    if (loading || !hydrated) return;
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setError('');
    setSaveError('');
    setConvId(null); // next send will create a new conversation
  }

  function handleDeleteConversation(id: string, title: string) {
    if (loading || !hydrated) return;
    if (!window.confirm(`「${title}」を削除しますか？`)) return;
    const ok = deleteConversation(id);
    if (!ok) {
      setSaveError('会話の削除に失敗しました。');
      return;
    }
    if (id === convId) {
      handleReset();
    }
    setConversations(loadConversations());
  }

  function handleSelectConversation(id: string) {
    if (!hydrated || loading) return;
    if (input.trim()) {
      if (!window.confirm('入力中の内容は破棄されます。切り替えますか？')) return;
    }
    const conv = getConversation(id);
    if (!conv) return;
    setConvId(conv.id);
    setMessages([INITIAL_MESSAGE, ...conv.messages]);
    setInput('');
    setError('');
    setSaveError('');
  }

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const charCount = input.length;
  const nearLimit = charCount > 400;

  return (
    <main className="h-dvh flex flex-col bg-surface-base text-text-primary overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 bg-surface-base/95 backdrop-blur-md border-b border-border-subtle pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto px-2 py-2 flex items-center gap-1">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="戻る"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            disabled={!hydrated}
            className="md:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-50"
            aria-label="会話履歴を開く"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 flex-shrink-0">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="text-sm font-medium text-text-secondary truncate">AIチャット</span>
          </div>
          {hasUserMessages && (
            <button
              onClick={handleReset}
              disabled={!hydrated || loading}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-surface-raised flex-shrink-0 disabled:opacity-50"
            >
              新規チャット
            </button>
          )}
        </div>
      </header>

      {/* Body: sidebar + chat */}
      <div className="flex-1 flex overflow-hidden">

        {/* PC Sidebar */}
        <aside className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-border-subtle">
          <div className="flex-shrink-0 p-3 border-b border-border-subtle">
            <button
              onClick={handleReset}
              disabled={!hydrated || loading}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新しいチャット
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 scrollbar-hide">
            {conversations.length === 0 ? (
              <p className="px-4 py-8 text-xs text-text-muted text-center">会話履歴はありません</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center mx-1 rounded-xl transition-colors ${
                    convId === conv.id
                      ? 'bg-surface-raised'
                      : 'hover:bg-surface-card'
                  }`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <button
                    onClick={() => handleSelectConversation(conv.id)}
                    disabled={loading || !hydrated}
                    className={`flex-1 min-w-0 text-left px-3 py-2.5 transition-colors disabled:opacity-50 ${
                      convId === conv.id
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <p className="text-xs font-medium truncate leading-snug">{conv.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{formatRelativeDate(conv.updatedAt)}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id, conv.title);
                    }}
                    disabled={loading || !hydrated}
                    className={`flex-shrink-0 p-1.5 mr-1 rounded-lg transition-all ${
                      loading || !hydrated
                        ? 'opacity-0 pointer-events-none'
                        : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400'
                    }`}
                    aria-label={`${conv.title}を削除`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 space-y-3">

              <p className="text-xs text-text-muted text-center">
                会話は自動保存されます
              </p>

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-accent-blue text-white rounded-br-sm'
                        : 'bg-surface-card border border-border text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="bg-surface-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-2xl px-4 py-3 space-y-2">
                  <p className="text-xs text-red-400">{error}</p>
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="text-xs text-text-muted border border-border rounded-xl px-3 py-1.5 hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
                  >
                    再試行する
                  </button>
                </div>
              )}

              {saveError && (
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl px-4 py-2.5">
                  <p className="text-xs text-amber-400">{saveError}</p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border-subtle bg-surface-base/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
            <div className="max-w-2xl mx-auto px-3 pt-2.5 pb-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="メッセージを入力..."
                    rows={2}
                    maxLength={MAX_CHARS}
                    disabled={loading || !hydrated}
                    className="w-full resize-none bg-surface-raised border border-border rounded-xl px-3 py-2 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-600 transition-colors disabled:opacity-50"
                  />
                  {nearLimit && (
                    <span className={`absolute bottom-2.5 right-2.5 text-xs pointer-events-none ${charCount >= MAX_CHARS ? 'text-red-400' : 'text-text-muted'}`}>
                      {charCount}/{MAX_CHARS}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim() || !hydrated}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="送信"
                >
                  {loading ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1.5 text-center">
                Enter で送信・Shift+Enter で改行
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex flex-col w-full max-w-72 bg-surface-base border-r border-border-subtle pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="text-sm font-medium text-text-secondary">会話履歴</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="閉じる"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-shrink-0 p-3 border-b border-border-subtle">
              <button
                onClick={() => { handleReset(); setDrawerOpen(false); }}
                disabled={!hydrated || loading}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新しいチャット
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {conversations.length === 0 ? (
                <p className="px-4 py-8 text-xs text-text-muted text-center">会話履歴はありません</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center mx-2 rounded-xl transition-colors ${
                      convId === conv.id ? 'bg-surface-raised' : 'hover:bg-surface-card'
                    }`}
                  >
                    <button
                      onClick={() => { handleSelectConversation(conv.id); setDrawerOpen(false); }}
                      disabled={loading || !hydrated}
                      className={`flex-1 min-w-0 text-left px-3 py-3 transition-colors disabled:opacity-50 ${
                        convId === conv.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <p className="text-sm font-medium truncate leading-snug">{conv.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatRelativeDate(conv.updatedAt)}</p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id, conv.title);
                      }}
                      disabled={loading || !hydrated}
                      className={`flex-shrink-0 p-2 mr-1 rounded-lg transition-all ${
                        loading || !hydrated
                          ? 'opacity-0 pointer-events-none'
                          : 'text-text-muted opacity-60 hover:opacity-100 hover:text-red-400'
                      }`}
                      aria-label={`${conv.title}を削除`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
