import Parser from 'rss-parser';
import { NextResponse } from 'next/server';
import { filterItmediaItem } from '@/lib/itmedia-filter';

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
  'content:encoded'?: string;
  content?: string;
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: ['media:content', 'enclosure', 'content:encoded'],
  },
});


const FEEDS: {
  url: string;
  source: string;
  category: Article['category'];
  categoryLabel: string;
  filterFn?: (title: string, description: string) => boolean;
}[] = [
  {
    url: 'https://toyokeizai.net/list/feed/rss',
    source: '東洋経済オンライン',
    category: 'eco',
    categoryLabel: '💹 経済',
  },
  {
    url: 'https://diamond.jp/list/feed/rss',
    source: 'ダイヤモンド・オンライン',
    category: 'eco',
    categoryLabel: '💹 経済',
  },
  {
    url: 'https://www.businessinsider.jp/feed/index.xml',
    source: 'Business Insider Japan',
    category: 'eco',
    categoryLabel: '💹 経済',
  },
  {
    url: 'https://thebridge.jp/feed',
    source: 'THE BRIDGE',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://sogyotecho.jp/feed/',
    source: '創業手帳',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://techcrunch.com/feed/',
    source: 'TechCrunch',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://rss.itmedia.co.jp/rss/2.0/enterprise.xml',
    source: 'ITmedia Enterprise',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
    filterFn: filterItmediaItem,
  },
  {
    url: 'https://coralcap.co/feed/',
    source: 'Coral Capital',
    category: 'startup',
    categoryLabel: '🚀 スタートアップ',
  },
  {
    url: 'https://news.google.com/rss/search?q=%E9%9D%99%E5%B2%A1+%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9&hl=ja&gl=JP&ceid=JP:ja',
    source: 'Google News 静岡',
    category: 'shizuoka',
    categoryLabel: '📍 静岡',
  },
  {
    url: 'https://news.google.com/rss/search?q=%E9%95%B7%E9%87%8E+%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9&hl=ja&gl=JP&ceid=JP:ja',
    source: 'Google News 長野',
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
    url: 'https://news.yahoo.co.jp/rss/media/agrinews/all.xml',
    source: '日本農業新聞',
    category: 'agri',
    categoryLabel: '🌾 農業',
  },
];

const TRACKING_URL_PATTERN = /pixel|tracker|analytics|tracking|beacon/i;

function isValidImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  if (TRACKING_URL_PATTERN.test(url)) return false;
  return true;
}

function extractImageFromHtml(html: string | undefined): string | null {
  if (!html) return null;
  const decoded = html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(parseInt(n, 10)));

  // Iterate all img tags to find the first valid one (not just the first img).
  for (const imgMatch of decoded.matchAll(/<img[^>]+>/gi)) {
    const imgTag = imgMatch[0];

    const wMatch = imgTag.match(/\swidth=["']?(\d+)["']?/i);
    const hMatch = imgTag.match(/\sheight=["']?(\d+)["']?/i);
    if (wMatch && (wMatch[1] === '0' || wMatch[1] === '1')) continue;
    if (hMatch && (hMatch[1] === '0' || hMatch[1] === '1')) continue;

    const srcMatch = imgTag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;

    if (isValidImageUrl(srcMatch[1])) return srcMatch[1];
  }
  return null;
}

function extractImage(item: CustomItem): string | null {
  const mc = item['media:content'];
  const mcUrl = mc?.['$']?.url ?? mc?.url;
  if (isValidImageUrl(mcUrl)) return mcUrl;
  const encUrl = item.enclosure?.url;
  if (isValidImageUrl(encUrl)) return encUrl;
  return extractImageFromHtml(item['content:encoded']) ?? extractImageFromHtml(item.content);
}

export async function GET() {
  const results: Article[] = [];

  await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        let feedItems = parsed.items;

        if (feed.filterFn) {
          const fn = feed.filterFn;
          const before = feedItems.length;
          const excluded: string[] = [];
          feedItems = feedItems.filter((item) => {
            const keep = fn(item.title ?? '', item.contentSnippet ?? '');
            if (!keep && process.env.NODE_ENV === 'development') {
              excluded.push(item.title ?? '（タイトルなし）');
            }
            return keep;
          });
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[${feed.source}] 取得: ${before}件 / フィルタ後: ${feedItems.length}件 / 採用: ${Math.min(feedItems.length, 10)}件`
            );
            if (excluded.length > 0) console.log(`[${feed.source}除外]`, excluded);
          }
        }

        const items = feedItems.slice(0, 10).map((item, i) => ({
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
      } catch (e) {
        console.error(`[RSS失敗] ${feed.source} (${feed.url}):`, e);
      }
    })
  );

  results.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const seenLinks = new Set<string>();
  const deduplicated = results.filter((article) => {
    if (article.link === '#' || seenLinks.has(article.link)) return false;
    seenLinks.add(article.link);
    return true;
  });

  return NextResponse.json(deduplicated);
}
