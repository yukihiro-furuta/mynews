export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return '1時間以内';
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}
