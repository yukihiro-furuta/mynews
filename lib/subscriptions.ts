import { Redis } from "@upstash/redis";

const KEY = "push:subscriptions";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url) throw new Error("UPSTASH_REDIS_REST_URL is not set");
  if (!token) throw new Error("UPSTASH_REDIS_REST_TOKEN is not set");
  return new Redis({ url, token });
}

function isValidSubscription(item: unknown): item is PushSubscriptionJSON {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof (item as Record<string, unknown>).endpoint === "string"
  );
}

export async function readSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const data = await getRedis().get(KEY);
  if (data === null) return [];
  if (!Array.isArray(data)) {
    // 配列でない場合のみ空を返す（全購読を消す操作を防ぐため書き戻しはしない）
    console.error("[subscriptions] Redisデータが配列でない 空配列を返す");
    return [];
  }
  const valid = data.filter(isValidSubscription);
  if (valid.length !== data.length) {
    console.error(`[subscriptions] 不正エントリを除外 total=${data.length} valid=${valid.length}`);
  }
  return valid;
}

export async function writeSubscriptions(subs: PushSubscriptionJSON[]) {
  await getRedis().set(KEY, subs);
}
