import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { readSubscriptions, writeSubscriptions } from "@/lib/subscriptions";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "おはようございます" : "お疲れ様です";
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "vapid configuration missing" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  let subs: PushSubscriptionJSON[];
  try {
    subs = await readSubscriptions();
  } catch (err) {
    const kind = err instanceof Error ? err.constructor.name : typeof err;
    console.error(`[notify] Redis読み取り失敗 kind=${kind}`);
    return NextResponse.json({ error: "storage read failed" }, { status: 500 });
  }

  if (subs.length === 0) {
    console.log("[notify] 購読なし、送信スキップ");
    return NextResponse.json({ sent: 0 });
  }

  console.log(`[notify] 開始 total=${subs.length}`);

  const payload = JSON.stringify({
    title: `MyNews ${getGreeting()}`,
    body: "新しいニュースをチェックしましょう",
    icon: "/icon-192.png",
    url: "/",
  });

  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub as Parameters<typeof webpush.sendNotification>[0], payload))
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      try {
        const reason = r.reason;
        const statusCode =
          reason !== null &&
          reason !== undefined &&
          typeof reason === "object" &&
          typeof (reason as Record<string, unknown>).statusCode === "number"
            ? (reason as { statusCode: number }).statusCode
            : "unknown";
        const kind = reason instanceof Error ? reason.constructor.name : typeof reason;
        console.error(`[notify] 送信失敗 index=${i} status=${statusCode} kind=${kind}`);
      } catch {
        console.error(`[notify] 送信失敗 index=${i} status=unknown kind=unknown`);
      }
    }
  });

  // 無効な購読を削除
  const valid = subs.filter((_, i) => {
    const r = results[i];
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      return err.statusCode !== 410 && err.statusCode !== 404;
    }
    return true;
  });

  const removed = subs.length - valid.length;

  if (removed > 0) {
    try {
      await writeSubscriptions(valid);
    } catch (err) {
      const kind = err instanceof Error ? err.constructor.name : typeof err;
      console.error(`[notify] Redis書き込み失敗 kind=${kind}`);
    }
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  console.log(`[notify] 完了 sent=${sent} failed=${failed} removed=${removed}`);

  return NextResponse.json({ sent, total: subs.length });
}
