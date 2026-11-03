// Run with: npx tsx scripts/test-itmedia-filter.ts
import { filterItmediaItem } from '../lib/itmedia-filter';

let passed = 0;
let failed = 0;

function expect(label: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

console.log('\n=== ITmedia Enterprise フィルタ テスト ===\n');

console.log('--- 除外されるべき記事（セキュリティ事故・脅威）---');
expect(
  '脆弱性: PHPに深刻な脆弱性、更新だけで対処の終わらない問題',
  filterItmediaItem('PHPに深刻な脆弱性、更新だけで対処の終わらない問題', ''),
  false,
);
expect(
  'マルウェア: 新種マルウェアが企業を狙う',
  filterItmediaItem('新種マルウェアが企業を狙う', 'セキュリティ対策が急務'),
  false,
);
expect(
  'ランサムウェア: 病院がランサムウェアに感染',
  filterItmediaItem('病院がランサムウェアに感染、患者データが流出', ''),
  false,
);
expect(
  'フィッシング: フィッシング詐欺の手口',
  filterItmediaItem('フィッシング詐欺の手口と対策', ''),
  false,
);
expect(
  '不正アクセス: 不正アクセスで個人情報漏えい',
  filterItmediaItem('不正アクセスで個人情報漏えい、5万件が流出', ''),
  false,
);
expect(
  '除外語がタイトル・説明の両方にある場合も除外',
  filterItmediaItem('標的型攻撃とは何か入門解説', 'ウイルスの仕組みを詳しく説明'),
  false,
);
expect(
  '除外語が説明のみにある場合も除外',
  filterItmediaItem('企業のDX推進と業務改革', '新たな脆弱性への対策について解説'),
  false,
);

console.log('\n--- 保持されるべき記事（経営戦略・セキュリティ投資）---');
expect(
  'CISO: タイトルにCISOが含まれる',
  filterItmediaItem('CISOが語るセキュリティ投資の最適化', ''),
  true,
);
expect(
  'セキュリティ投資: タイトルに含まれる',
  filterItmediaItem('セキュリティ投資のROIを高める3つの戦略', ''),
  true,
);
expect(
  'ゼロトラスト: タイトルに含まれる',
  filterItmediaItem('ゼロトラスト導入で変わる企業のセキュリティ体制', ''),
  true,
);
expect(
  '経営戦略: タイトルに含まれる（除外キーワードなし）',
  filterItmediaItem('DX推進における経営戦略とセキュリティの両立', 'DX推進のポイントを解説'),
  true,
);

console.log('\n--- 説明文に有益な語があっても除外キーワードが優先される ---');
expect(
  'タイトル除外 + 説明文にROI → 除外されるべき',
  filterItmediaItem('マルウェアによる被害が急増、企業は対策を', 'ROIを考慮した導入が求められる'),
  false,
);
expect(
  'タイトル除外 + 説明文にコスト削減 → 除外されるべき',
  filterItmediaItem('不正アクセス被害で個人情報が流出', 'セキュリティコスト削減の観点から'),
  false,
);
expect(
  'タイトル除外 + 説明文にCISO → 除外されるべき',
  filterItmediaItem('フィッシング攻撃が増加、標的型メールの手口', 'CISOへの報告が必要なケース'),
  false,
);

console.log('\n--- 保持されるべき記事（AI・SaaS・新規事業）---');
expect(
  'AI活用記事（除外キーワードなし）',
  filterItmediaItem('生成AIで業務効率化、導入企業が急増', ''),
  true,
);
expect(
  'SaaS導入記事',
  filterItmediaItem('SaaS型ERPへの移行で管理コストを半減', ''),
  true,
);
expect(
  '新規事業記事',
  filterItmediaItem('スタートアップが新規事業でDXを加速', ''),
  true,
);
expect(
  'クラウド移行記事',
  filterItmediaItem('オンプレからクラウドへ、移行を成功させる3つのポイント', ''),
  true,
);

console.log('\n--- タイトルに有益な語と除外語が両方ある場合（除外優先）---');
expect(
  'CISO + マルウェア → 除外',
  filterItmediaItem('CISOがマルウェア対策を発表', ''),
  false,
);
expect(
  'セキュリティ投資 + ランサムウェア → 除外',
  filterItmediaItem('セキュリティ投資でランサムウェア対策', ''),
  false,
);
expect(
  'ゼロトラスト + 脆弱性 → 除外',
  filterItmediaItem('ゼロトラストと脆弱性対策', ''),
  false,
);
expect(
  'CISO + 経営戦略（除外キーワードなし）→ 保持',
  filterItmediaItem('CISOが語る経営戦略', ''),
  true,
);

console.log(`\n=== 結果: ${passed} 件通過 / ${failed} 件失敗 ===\n`);
if (failed > 0) process.exit(1);
