import "server-only";
import webpush from "web-push";

let configured: boolean | null = null;

export function configureWebPush(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:privacy@smashingburger.id";
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(subject, pub, priv);
  return (configured = true);
}

export interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Returns "gone" when the push service says the subscription is dead (404/410) so it can be pruned. */
export async function sendPush(
  sub: StoredSubscription,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<"sent" | "gone" | "error"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}
