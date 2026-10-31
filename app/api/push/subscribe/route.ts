import { NextRequest, NextResponse } from "next/server";
import { readSubscriptions, writeSubscriptions } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const subs = await readSubscriptions();
  const exists = subs.some((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    await writeSubscriptions(subs);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  const subs = await readSubscriptions();
  await writeSubscriptions(subs.filter((s) => s.endpoint !== endpoint));
  return NextResponse.json({ ok: true });
}
