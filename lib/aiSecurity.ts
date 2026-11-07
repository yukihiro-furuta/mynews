import { createHash } from 'crypto';
import type { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

// --- Origin validation ---

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // 開発用ローカルホスト（常に許可）
  origins.add('http://localhost:3000');
  origins.add('http://localhost:3001');

  // 本番カスタムドメイン（Vercel環境変数 SITE_URL または NEXT_PUBLIC_SITE_URL で設定）
  const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try { origins.add(new URL(siteUrl).origin); } catch { /* 不正なURLは無視 */ }
  }

  // VercelデプロイURL（Vercelが自動設定するサーバー側信頼済み環境変数）
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    origins.add(`https://${vercelUrl}`);
  }

  // 追加許可Origin（カンマ区切り、ALLOWED_ORIGINS環境変数）
  const extra = process.env.ALLOWED_ORIGINS;
  if (extra) {
    for (const o of extra.split(',')) {
      const trimmed = o.trim();
      if (!trimmed) continue;
      try { origins.add(new URL(trimmed).origin); } catch { /* 不正なURLは無視 */ }
    }
  }

  return origins;
}

/**
 * OriginヘッダーをURLとして解析し、許可リストと完全一致で検証する。
 * Originが存在しない・不正なURL・リスト外のOriginはすべて拒否。
 *
 * 注意：これは完全な認証ではなく、不正利用の抑止手段の一つ。
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return getAllowedOrigins().has(new URL(origin).origin);
  } catch {
    return false;
  }
}

// --- クライアントIPアドレス取得 ---

/**
 * VercelプロキシヘッダーからクライアントのIPを取得する。
 * x-forwarded-for の最左エントリが元のクライアントIP。
 * 取得できない場合は 'unknown' を返す。
 *
 * 注意：Vercel以外のプロキシ経由の場合、x-forwarded-forは偽装可能。
 * 'unknown' が返る場合、全リクエストが同一カウンタを共有する。
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

// --- Redisレート制限 ---

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Redisを用いた固定ウィンドウ方式のレート制限。
 * カウンタはIncrによって増加し、ウィンドウ終了後に自動削除される。
 * Redis障害時はエラーをthrowする（呼び出し元でfail-closedに処理）。
 */
export async function checkRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowIndex = Math.floor(Date.now() / 1000 / windowSeconds);
  const windowKey = `rl:${key}:${windowIndex}`;

  const pipe = redis.pipeline();
  pipe.incr(windowKey);
  pipe.expire(windowKey, windowSeconds + 60); // ウィンドウ終了後に確実に削除
  const results = await pipe.exec() as unknown[];
  const count = results[0] as number;

  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((windowIndex + 1) * windowSeconds - Date.now() / 1000),
  );

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}

// --- 記事IDフォーマット検証 ---

const VALID_CATEGORIES = new Set(['eco', 'startup', 'shizuoka', 'nagano', 'agri']);

/**
 * safeId が既知カテゴリプレフィックスで始まるか検証する部分的チェック。
 * 記事の実在確認は不可（RSSは動的取得のため永続ストレージがない）。
 */
export function isValidArticleIdFormat(safeId: string): boolean {
  return Array.from(VALID_CATEGORIES).some(cat => safeId.startsWith(`${cat}-`));
}

// --- コンテンツハッシュ ---

/**
 * タイトルと概要の内容に基づくSHA-256ハッシュ（先頭16文字）。
 * 内容が変わると別ハッシュになり、異なるキャッシュキーになる。
 */
export function articleContentHash(title: string, description: string): string {
  return createHash('sha256')
    .update(`${title}||${description}`)
    .digest('hex')
    .slice(0, 16);
}
