const STORAGE_KEY = 'analysis_history';
const SCHEMA_VERSION = 1;
const MAX_ENTRIES = 50;
const MAX_ANALYSIS_LENGTH = 10_000;

export type AnalysisEntry = {
  articleId: string;
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
  savedAt: string;
  analysis: string;
  contentHash: string;
};

type StorageData = {
  version: number;
  entries: AnalysisEntry[];
};

// Discriminated union representing every possible state of the localStorage entry.
// Write functions must check for 'unknown_version' before touching the store.
type StorageState =
  | { kind: 'ok'; entries: AnalysisEntry[] }
  | { kind: 'empty' }
  | { kind: 'unknown_version' }
  | { kind: 'parse_error' }
  | { kind: 'access_error' };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'storage_full' | 'invalid' | 'unsupported_version' | 'access_error' | 'parse_error' };

export type HistoryLoadResult =
  | { ok: true; entries: AnalysisEntry[] }
  | { ok: false; reason: 'parse_error' | 'access_error' };

// --- Helper ---

/**
 * Client-side content hash for change detection.
 * SHA-256 (Web Crypto API), same algorithm as the server-side articleContentHash().
 * Input truncation mirrors the analyze API (title: 500 chars, description: 2000 chars).
 * Throws if Web Crypto API is unavailable — never silently falls back to a weaker hash.
 */
export async function computeContentHash(title: string, description?: string): Promise<string> {
  if (!crypto?.subtle) throw new Error('Web Crypto API is not available');
  const t = title.trim().slice(0, 500);
  const d = (description ?? '').trim().slice(0, 2000);
  const encoded = new TextEncoder().encode(`${t}||${d}`);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  const hex = Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}

// --- Validation ---

// Read-time: structure only, no length limits (preserves existing data)
function isValidEntryStructure(e: unknown): e is AnalysisEntry {
  if (!e || typeof e !== 'object') return false;
  const entry = e as Record<string, unknown>;
  return (
    typeof entry.articleId === 'string' && entry.articleId.trim().length > 0 &&
    typeof entry.title === 'string' &&
    typeof entry.link === 'string' &&
    typeof entry.source === 'string' &&
    typeof entry.category === 'string' &&
    typeof entry.pubDate === 'string' &&
    typeof entry.savedAt === 'string' &&
    typeof entry.analysis === 'string' && entry.analysis.trim().length > 0 &&
    typeof entry.contentHash === 'string'
  );
}

// Write-time: structure + length limit on analysis
function isValidEntryForWrite(e: unknown): e is AnalysisEntry {
  if (!isValidEntryStructure(e)) return false;
  return (e as AnalysisEntry).analysis.length <= MAX_ANALYSIS_LENGTH;
}

// --- Storage helpers ---

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// Full state discrimination. The only source of truth for all read AND write paths.
function readStorageState(): StorageState {
  if (!isClient()) return { kind: 'access_error' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kind: 'empty' };
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const data = parsed as Record<string, unknown>;
      // A numeric version that is not ours: treat as unknown and refuse all writes.
      if (typeof data.version === 'number' && data.version !== SCHEMA_VERSION) {
        return { kind: 'unknown_version' };
      }
      if (Array.isArray(data.entries)) {
        return { kind: 'ok', entries: data.entries.filter(isValidEntryStructure) };
      }
    }
    return { kind: 'empty' };
  } catch {
    return { kind: 'parse_error' };
  }
}

// Convenience wrapper for read-only callers: returns entries or [].
function readStorage(): AnalysisEntry[] {
  const state = readStorageState();
  return state.kind === 'ok' ? state.entries : [];
}

function writeStorage(entries: AnalysisEntry[]): boolean {
  if (!isClient()) return false;
  try {
    const data: StorageData = { version: SCHEMA_VERSION, entries };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// --- Public API ---

export function loadAnalysisHistory(): AnalysisEntry[] {
  return readStorage().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function loadAnalysisState(): HistoryLoadResult {
  const state = readStorageState();
  if (state.kind === 'parse_error') return { ok: false, reason: 'parse_error' };
  if (state.kind === 'access_error') return { ok: false, reason: 'access_error' };
  const entries = state.kind === 'ok' ? state.entries : [];
  return {
    ok: true,
    entries: entries.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
  };
}

export function saveAnalysis(entry: AnalysisEntry): SaveResult {
  if (!isValidEntryForWrite(entry)) {
    return { ok: false, reason: 'invalid' };
  }

  const state = readStorageState();
  if (state.kind === 'unknown_version') {
    return { ok: false, reason: 'unsupported_version' };
  }
  if (state.kind === 'access_error') {
    return { ok: false, reason: 'access_error' };
  }
  // parse_error means the stored JSON is unreadable. Block writes to prevent
  // overwriting potentially recoverable data with an empty/partial state.
  if (state.kind === 'parse_error') {
    return { ok: false, reason: 'parse_error' };
  }

  const all = state.kind === 'ok' ? [...state.entries] : [];

  const existingIndex = all.findIndex((e) => e.articleId === entry.articleId);
  if (existingIndex >= 0) {
    // Overwrite existing entry (re-save after re-analysis)
    all[existingIndex] = { ...entry, savedAt: new Date().toISOString() };
  } else {
    // New entry: enforce limit by removing the oldest (FIFO)
    if (all.length >= MAX_ENTRIES) {
      const sorted = [...all].sort(
        (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
      );
      const oldestId = sorted[0].articleId;
      const idx = all.findIndex((e) => e.articleId === oldestId);
      if (idx >= 0) all.splice(idx, 1);
    }
    all.push({ ...entry, savedAt: new Date().toISOString() });
  }

  const ok = writeStorage(all);
  return ok ? { ok: true } : { ok: false, reason: 'storage_full' };
}

export function deleteAnalysis(articleId: string): boolean {
  const state = readStorageState();
  if (state.kind === 'unknown_version') return false;
  const all = state.kind === 'ok' ? [...state.entries] : [];

  const next = all.filter((e) => e.articleId !== articleId);
  if (next.length === all.length) return false;
  return writeStorage(next);
}

export function isAnalysisSaved(articleId: string): boolean {
  return readStorage().some((e) => e.articleId === articleId);
}

export function getAnalysisCount(): number {
  return readStorage().length;
}
