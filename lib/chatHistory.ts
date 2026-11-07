const STORAGE_KEY = 'chat_conversations';
const SCHEMA_VERSION = 1;
const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 50;
const MAX_USER_CONTENT_LENGTH = 500;
const MAX_AI_CONTENT_LENGTH = 5000;

export type ChatKind = 'general' | 'article';

export type SavedMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  kind: ChatKind;
  articleId?: string;
  articleTitle?: string;
  messages: SavedMessage[];
  createdAt: string;
  updatedAt: string;
};

type StorageData = {
  version: number;
  conversations: Conversation[];
};

// Discriminated union representing every possible state of the localStorage entry.
// Write functions must check for 'unknown_version' before touching the store.
type StorageState =
  | { kind: 'ok'; conversations: Conversation[] }
  | { kind: 'empty' }
  | { kind: 'unknown_version' }
  | { kind: 'parse_error' }
  | { kind: 'access_error' };

// --- Validation ---

function isValidRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant';
}

// Read-time: structure only, no length limits (preserves existing data with long content)
function isValidMessageStructure(m: unknown): m is SavedMessage {
  if (!m || typeof m !== 'object') return false;
  const msg = m as Record<string, unknown>;
  return (
    isValidRole(msg.role) &&
    typeof msg.content === 'string' &&
    msg.content.trim().length > 0
  );
}

// Write-time: structure + length limits by role
function isValidMessage(m: unknown): m is SavedMessage {
  if (!m || typeof m !== 'object') return false;
  const msg = m as Record<string, unknown>;
  if (!isValidRole(msg.role) || typeof msg.content !== 'string' || msg.content.trim().length === 0) return false;
  const maxLength = msg.role === 'user' ? MAX_USER_CONTENT_LENGTH : MAX_AI_CONTENT_LENGTH;
  return msg.content.length <= maxLength;
}

function isValidKind(kind: unknown): kind is ChatKind {
  return kind === 'general' || kind === 'article';
}

function isValidConversation(c: unknown): c is Conversation {
  if (!c || typeof c !== 'object') return false;
  const conv = c as Record<string, unknown>;
  return (
    typeof conv.id === 'string' && conv.id.length > 0 &&
    typeof conv.title === 'string' &&
    isValidKind(conv.kind) &&
    Array.isArray(conv.messages) &&
    conv.messages.every(isValidMessageStructure) &&
    typeof conv.createdAt === 'string' &&
    typeof conv.updatedAt === 'string'
  );
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
      if (Array.isArray(data.conversations)) {
        return { kind: 'ok', conversations: data.conversations.filter(isValidConversation) };
      }
    }
    // Legacy: bare array written before version field existed.
    if (Array.isArray(parsed)) {
      return { kind: 'ok', conversations: parsed.filter(isValidConversation) };
    }
    return { kind: 'empty' };
  } catch {
    return { kind: 'parse_error' };
  }
}

// Convenience wrapper for read-only callers: returns conversations or [].
function readStorage(): Conversation[] {
  const state = readStorageState();
  return state.kind === 'ok' ? state.conversations : [];
}

function writeStorage(conversations: Conversation[]): boolean {
  if (!isClient()) return false;
  try {
    const data: StorageData = { version: SCHEMA_VERSION, conversations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// --- Public API ---

export function loadConversations(): Conversation[] {
  return readStorage().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'limit_reached' | 'storage_full' | 'invalid' | 'not_found' | 'unsupported_version' };

export function saveConversation(conversation: Conversation): SaveResult {
  if (!isValidConversation(conversation)) {
    return { ok: false, reason: 'invalid' };
  }

  const state = readStorageState();
  if (state.kind === 'unknown_version') {
    return { ok: false, reason: 'unsupported_version' };
  }
  const all = state.kind === 'ok' ? [...state.conversations] : [];

  const existingIndex = all.findIndex((c) => c.id === conversation.id);
  if (existingIndex >= 0) {
    all[existingIndex] = conversation;
  } else {
    if (all.length >= MAX_CONVERSATIONS) {
      return { ok: false, reason: 'limit_reached' };
    }
    all.push(conversation);
  }

  const ok = writeStorage(all);
  return ok ? { ok: true } : { ok: false, reason: 'storage_full' };
}

export function updateConversation(
  id: string,
  partial: Partial<Omit<Conversation, 'id' | 'createdAt'>>
): SaveResult {
  const state = readStorageState();
  if (state.kind === 'unknown_version') {
    return { ok: false, reason: 'unsupported_version' };
  }
  const all = state.kind === 'ok' ? [...state.conversations] : [];

  const index = all.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, reason: 'not_found' };

  all[index] = {
    ...all[index],
    ...partial,
    id,
    createdAt: all[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (!isValidConversation(all[index])) {
    return { ok: false, reason: 'invalid' };
  }

  const ok = writeStorage(all);
  return ok ? { ok: true } : { ok: false, reason: 'storage_full' };
}

export function deleteConversation(id: string): boolean {
  const state = readStorageState();
  if (state.kind === 'unknown_version') return false;
  const all = state.kind === 'ok' ? [...state.conversations] : [];

  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  return writeStorage(next);
}

export function getConversation(id: string): Conversation | null {
  return readStorage().find((c) => c.id === id) ?? null;
}

export type AppendResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'limit_reached' | 'invalid' | 'storage_full' | 'unsupported_version' };

export function appendMessage(id: string, message: SavedMessage): AppendResult {
  if (!isValidMessage(message)) {
    return { ok: false, reason: 'invalid' };
  }

  const state = readStorageState();
  if (state.kind === 'unknown_version') {
    return { ok: false, reason: 'unsupported_version' };
  }
  const all = state.kind === 'ok' ? [...state.conversations] : [];

  const index = all.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, reason: 'not_found' };

  if (all[index].messages.length >= MAX_MESSAGES) {
    return { ok: false, reason: 'limit_reached' };
  }

  all[index] = {
    ...all[index],
    messages: [...all[index].messages, message],
    updatedAt: new Date().toISOString(),
  };

  const ok = writeStorage(all);
  return ok ? { ok: true } : { ok: false, reason: 'storage_full' };
}
