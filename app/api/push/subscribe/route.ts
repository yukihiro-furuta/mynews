import { NextRequest, NextResponse } from "next/server";
import { readSubscriptions, writeSubscriptions } from "@/lib/subscriptions";

function isValidSubscription(sub: unknown): sub is PushSubscriptionJSON {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as Record<string, unknown>;
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://")) return false;
  const keys = s.keys;
  if (!keys || typeof keys !== "object") return false;
  const k = keys as Record<string, unknown>;
  return typeof k.p256dh === "string" && typeof k.auth === "string";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!isValidSubscription(body)) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  let subs: PushSubscriptionJSON[];
  try {
    subs = await readSubscriptions();
  } catch {
    return NextResponse.json({ error: "storage read failed" }, { status: 500 });
  }

  const exists = subs.some((s) => s.endpoint === body.endpoint);
  if (!exists) {
    subs.push(body);
    try {
      await writeSubscriptions(subs);
    } catch {
      return NextResponse.json({ error: "storage write failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { endpoint } = body as Record<string, unknown>;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });
  }

  let subs: PushSubscriptionJSON[];
  try {
    subs = await readSubscriptions();
  } catch {
    return NextResponse.json({ error: "storage read failed" }, { status: 500 });
  }

  const filtered = subs.filter((s) => s.endpoint !== endpoint);
  if (filtered.length !== subs.length) {
    try {
      await writeSubscriptions(filtered);
    } catch {
      return NextResponse.json({ error: "storage write failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
