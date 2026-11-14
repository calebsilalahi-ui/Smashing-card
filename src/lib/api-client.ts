"use client";
/** Typed browser wrappers around the app's API routes. Never throws for expected API errors. */
import type { ConsentType, Member, RedeemResponse, ScanResponse } from "./types";

async function postJson<T>(url: string, body: unknown, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

/** imageDataUrl: compressed "data:image/jpeg;base64,..." string (≤ ~300 KB). */
export function scanReceipt(imageDataUrl: string): Promise<ScanResponse> {
  return postJson<ScanResponse>("/api/scan-receipt", { image: imageDataUrl }, {
    ok: false,
    code: "server_error",
    message: "Network error — please check your connection and try again.",
  });
}

export function redeemReward(pin: string): Promise<RedeemResponse> {
  return postJson<RedeemResponse>("/api/redeem", { pin }, {
    ok: false,
    code: "server_error",
    message: "Network error — please try again.",
  });
}

/** Returns the signed-in member, or null when signed out (401) / unavailable. */
export async function getMe(): Promise<Member | null> {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { member?: Member };
    return data.member ?? null;
  } catch {
    return null;
  }
}

export async function logConsent(types: ConsentType[], granted = true): Promise<boolean> {
  const res = await postJson<{ ok: boolean }>("/api/consent", { types, granted }, { ok: false });
  return res.ok;
}

export async function savePushSubscription(sub: PushSubscriptionJSON): Promise<boolean> {
  const res = await postJson<{ ok: boolean }>("/api/push/subscribe", sub, { ok: false });
  return res.ok;
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Downloads a JSON export of all personal data (UU PDP right of access / portability). */
export async function exportAccountData(): Promise<boolean> {
  try {
    const res = await fetch("/api/account/delete", { method: "GET", credentials: "same-origin" });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smashing-burger-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Permanently deletes the account and all linked data (UU PDP right to erasure). */
export async function deleteAccount(): Promise<boolean> {
  try {
    const res = await fetch("/api/account/delete", { method: "DELETE", credentials: "same-origin" });
    return res.ok;
  } catch {
    return false;
  }
}
