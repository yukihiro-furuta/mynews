import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = "push:subscriptions";

export async function readSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const data = await redis.get<PushSubscriptionJSON[]>(KEY);
  return data ?? [];
}

export async function writeSubscriptions(subs: PushSubscriptionJSON[]) {
  await redis.set(KEY, subs);
}
