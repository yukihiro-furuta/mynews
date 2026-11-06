import type { Article } from '@/app/api/news/route';
import { buildArticleId } from '@/lib/stableId';

const KEY = 'saved_articles';
const MIGRATION_KEY = 'saved_articles_migrated_v1';

/**
 * One-time migration from index-based IDs ("eco-東洋経済-0") to stable hash IDs.
 * Idempotent: once the migration flag is set it never runs again.
 * Articles without a link are kept as-is rather than discarded.
 */
function migrateIds(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const saved: Article[] = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const seenIds = new Set<string>();
    const migrated = saved
      .map((a) => {
        const hasOldFormat = /^(eco|startup|shizuoka|nagano|agri)-.+-\d+$/.test(a.id);
        if (!hasOldFormat) return a;

        const newId =
          a.link && a.link !== '#'
            ? buildArticleId(a.category, undefined, a.link, a.source, 0)
            : a.id;
        return { ...a, id: newId };
      })
      .filter((a) => {
        if (seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
      });

    localStorage.setItem(KEY, JSON.stringify(migrated));
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch {
    localStorage.setItem(MIGRATION_KEY, '1');
  }
}

export function loadSaved(): Article[] {
  migrateIds();
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function toggleSaved(article: Article): Article[] {
  const current = loadSaved();
  const isSaved = current.some((a) => a.id === article.id);
  const next = isSaved
    ? current.filter((a) => a.id !== article.id)
    : [article, ...current];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeSaved(id: string): Article[] {
  const next = loadSaved().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearSaved(): void {
  localStorage.removeItem(KEY);
}
