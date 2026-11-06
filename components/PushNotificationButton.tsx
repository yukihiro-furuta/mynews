"use client";

import { useEffect, useState } from "react";

type Status = "unsupported" | "default" | "granted" | "denied" | "loading";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationButton() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    // Notification.permissionだけでなく実際の購読状態を確認する
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setStatus(sub ? "granted" : (Notification.permission as Status));
      })
      .catch(() => {
        setStatus(Notification.permission as Status);
      });
  }, []);

  async function subscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        // APIエラー時はブラウザ側の購読も取り消す
        await sub.unsubscribe();
        // unsubscribe後は購読なし。permissionが"granted"でも"subscribed"ではない
        setStatus("default");
        return;
      }
      setStatus("granted");
    } catch {
      // permission="granted"はブラウザ許可を示すだけで購読の存在を保証しない
      setStatus(Notification.permission === "denied" ? "denied" : "default");
    }
  }

  async function unsubscribe() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const res = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!res.ok) {
          setStatus("granted");
          return;
        }
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch {
      setStatus("granted");
    }
  }

  if (status === "unsupported") return null;

  if (status === "loading") {
    return (
      <button disabled className="text-xs px-3 py-1.5 rounded-full bg-gray-200 text-gray-400">
        ...
      </button>
    );
  }

  if (status === "granted") {
    return (
      <button
        onClick={unsubscribe}
        className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors"
      >
        🔔 通知ON
      </button>
    );
  }

  if (status === "denied") {
    return (
      <span className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-400 border border-red-200">
        🔕 通知がブロックされています
      </span>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 transition-colors"
    >
      🔔 通知を受け取る
    </button>
  );
}
