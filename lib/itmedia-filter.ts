export const ITMEDIA_EXCLUDE_KEYWORDS = [
  '脆弱性', 'フィッシング', 'マルウェア', 'ランサムウェア', '不正アクセス',
  '情報漏えい', '個人情報漏えい', '不正利用', 'ウイルス', '標的型攻撃',
];

// Returns true if the article should be kept (not filtered out).
// Articles are excluded when an exclude keyword appears in the title or description.
export function filterItmediaItem(title: string, description: string): boolean {
  if (ITMEDIA_EXCLUDE_KEYWORDS.some((kw) => (title + ' ' + description).includes(kw))) return false;
  return true;
}
