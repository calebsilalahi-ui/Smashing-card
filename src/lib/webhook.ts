import "server-only";

/** Fire-and-await POST to STORE_WEBHOOK_URL (e.g. a Slack/Discord/Make/Zapier hook). Never throws. */
export async function postStoreWebhook(payload: Record<string, unknown>): Promise<boolean> {
  const url = process.env.STORE_WEBHOOK_URL;
  if (!url) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const text = typeof payload.text === "string" ? payload.text : undefined;
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      // `text`/`content` make the payload render natively in Slack and Discord webhooks.
      body: JSON.stringify(text ? { ...payload, content: text } : payload),
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export function formatWIB(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(typeof iso === "string" ? new Date(iso) : iso) + " WIB";
}
