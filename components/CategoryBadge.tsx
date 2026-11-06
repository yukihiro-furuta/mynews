import type { Article } from '@/app/api/news/route';
import { CAT_STYLE } from '@/lib/categoryStyles';

interface Props {
  category: Article['category'];
  label: string;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, label, size = 'sm' }: Props) {
  const s = CAT_STYLE[category];
  return (
    <span
      className={`inline-block font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border} ${
        size === 'md' ? 'text-sm' : 'text-xs'
      }`}
    >
      {label}
    </span>
  );
}
