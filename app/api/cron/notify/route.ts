import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { readSubscriptions, writeSubscriptions } from "@/lib/subscriptions";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "おはようございます" : "お疲れ様です";
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const subs = await readSubscriptions();
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({
    title: `MyNews ${getGreeting()}`,
    body: "新しいニュースをチェックしましょう",
    icon: "/icon-192.png",
    url: "/",
  });

  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub as Parameters<typeof webpush.sendNotification>[0], payload))
  );

  // 無効な購読を削除
  const valid = subs.filter((_, i) => {
    const r = results[i];
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      return err.statusCode !== 410 && err.statusCode !== 404;
    }
    return true;
  });
  if (valid.length !== subs.length) {
    await writeSubscriptions(valid);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs.length });
}
