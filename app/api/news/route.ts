import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

export type Article = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  category: 'eco' | 'startup' | 'shizuoka' | 'nagano' | 'agri';
  categoryLabel: string;
  image: string | null;
};

type CustomItem = {
  'media:content'?: { $?: { url?: string }; url?: string };
  enclosure?: { url?: string };
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: ['media:content', 'enclosure'],
  },
});

const FEEDS: {
  url: string;
  source: string;
  category: Article['category'];
  categoryLabel: string;
}[] = [
  {
    url: 'https://www.nhk.or.jp/rss/news/cat3.xml',
    source: 'NHK',
    category: 'eco',
    categoryLabel: '💹 経済',
  },
  {
    url: 'https://jp.techcrunch.com/feed/',
    source: 'TechCrunch Japan',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://thebridge.jp/feed',
    source: 'THE BRIDGE',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://www.nhk.or.jp/shizuoka/lnews/rss.xml',
    source: 'NHK静岡',
    category: 'shizuoka',
    categoryLabel: '📍 静岡',
  },
  {
    url: 'https://www.nhk.or.jp/nagano/lnews/rss.xml',
    source: 'NHK長野',
    category: 'nagano',
    categoryLabel: '📍 長野',
  },
  {
    url: 'https://agri.mynavi.jp/feed/',
    source: 'マイナビ農業',
    category: 'agri',
    categoryLabel: '🌾 農業',
  },
  {
    url: 'https://www.jacom.or.jp/rss/rss2.xml',
    source: 'JA新聞',
    category: 'agri',
    categoryLabel: '🌾 農業',
  },
];

function extractImage(item: CustomItem): string | null {
  const mc = item['media:content'];
  if (mc?.['$']?.url) return mc['$'].url!;
  if (mc?.url) return mc.url;
  if (item.enclosure?.url) return item.enclosure.url;
  return null;
}

export async function GET() {
  const results: Article[] = [];

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        const items = parsed.items.slice(0, 10).map((item, i) => ({
          id: `${feed.category}-${feed.source}-${i}`,
          title: item.title ?? '（タイトルなし）',
          link: item.link ?? '#',
          pubDate: item.pubDate ?? item.isoDate ?? '',
          source: feed.source,
          category: feed.category,
          categoryLabel: feed.categoryLabel,
          image: extractImage(item),
        }));
        results.push(...items);
      } catch {
        // そのフィードだけスキップして他は表示継続
      }
    })
  );

  results.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return NextResponse.json(results);
}
