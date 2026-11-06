/**
 * djb2 variant — 32-bit unsigned hash → base36 string
 * Deterministic, URL-safe, no external dependencies.
 * Collision probability ~1/4B per category namespace.
 */
export function stableId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (((hash << 5) + hash) ^ trimmed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

/**
 * Build a stable article ID from RSS item fields.
 * Priority: guid > link > fallback
 * Result format: "{category}-{7charHash}" or "{category}-{source}-{i}" fallback
 */
export function buildArticleId(
  category: string,
  guid: string | undefined,
  link: string | undefined,
  source: string,
  index: number,
): string {
  const primary = guid?.trim() || link?.trim();
  if (primary) {
    return `${category}-${stableId(primary)}`;
  }
  return `${category}-${source.replace(/\s+/g, '_')}-${index}`;
}
