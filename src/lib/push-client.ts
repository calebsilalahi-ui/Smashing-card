"use client";
import { logConsent, removePushSubscription, savePushSubscription } from "./api-client";

export type PushFailReason = "unsupported" | "needs_install" | "denied" | "no_vapid" | "server_error";

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone);
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

export async function subscribePush(): Promise<{ ok: boolean; reason?: PushFailReason }> {
  if (isIOS() && !isStandalonePWA()) return { ok: false, reason: "needs_install" };
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: "no_vapid" };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    const reg = await getRegistration();
    if (!reg) return { ok: false, reason: "unsupported" };
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) }));
    const saved = await savePushSubscription(sub.toJSON());
    if (!saved) return { ok: false, reason: "server_error" };
    await logConsent(["push_reminders"]);
    return { ok: true };
  } catch {
    return { ok: false, reason: "server_error" };
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    const sub = await getCurrentSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await removePushSubscription(endpoint);
    }
    await logConsent(["push_reminders"], false);
    return true;
  } catch {
    return false;
  }
}
