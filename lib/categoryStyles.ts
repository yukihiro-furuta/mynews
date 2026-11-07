import type { Article } from '@/app/api/news/route';

export const CAT_STYLE: Record<
  Article['category'],
  { bg: string; text: string; border: string; left: string }
> = {
  eco:      { bg: 'bg-yellow-950/70', text: 'text-yellow-400', border: 'border-yellow-700/60', left: 'border-l-yellow-500' },
  startup:  { bg: 'bg-purple-950/70', text: 'text-purple-400', border: 'border-purple-700/60', left: 'border-l-purple-500' },
  shizuoka: { bg: 'bg-teal-950/70',   text: 'text-teal-400',   border: 'border-teal-700/60',   left: 'border-l-teal-500'  },
  nagano:   { bg: 'bg-teal-950/70',   text: 'text-teal-400',   border: 'border-teal-700/60',   left: 'border-l-teal-400'  },
  agri:     { bg: 'bg-green-950/70',  text: 'text-green-400',  border: 'border-green-700/60',  left: 'border-l-green-500' },
};

export const FILTERS = [
  { key: 'all',      label: 'すべて' },
  { key: 'eco',      label: '💹 経済' },
  { key: 'startup',  label: '🚀 スタートアップ' },
  { key: 'shizuoka', label: '📍 静岡' },
  { key: 'nagano',   label: '📍 長野' },
  { key: 'agri',     label: '🌾 農業' },
] as const;
