import "server-only";
import type { VisionReceipt } from "./types";

/**
 * MokaPOS receipt Vision OCR. Supports Google Gemini (GEMINI_API_KEY) or Anthropic Claude (ANTHROPIC_API_KEY)
 * over plain fetch (no SDK). Set VISION_PROVIDER=gemini|anthropic to force one when both keys exist.
 */

export class VisionUnavailableError extends Error {}
export class VisionFailedError extends Error {}

const PROMPT = `You are a strict receipt verifier for the Indonesian burger restaurant "SMASHING BURGER".
The image should be a MokaPOS thermal receipt. MokaPOS layout: store logo/name header at top, address,
a "Receipt Number" row with an alphanumeric code (e.g. QGKTER5), a date (e.g. "14 Nov 2026") and time,
itemised lines, then Subtotal, optional tax/service rows, a bold "Total" row (e.g. "Rp. 110.000"),
then payment rows such as "Cash"/"QRIS"/"Debit" and "Change", and a "Powered by Moka" footer.

Return ONLY a JSON object with exactly these keys:
{"is_smashing_receipt": boolean, "receipt_number": string, "receipt_date": string, "total_idr": number, "confidence": number}

Rules:
- is_smashing_receipt: true ONLY if the header clearly shows "Smashing Burger" AND it is a real printed MokaPOS-style receipt
  (not a screenshot of text, not a hand-written note, not another restaurant). If unsure, false.
- receipt_number: the code printed next to "Receipt Number" (letters/digits only, uppercase). Empty string if not visible.
- receipt_date: the transaction date formatted as YYYY-MM-DD. Indonesian month names may appear (Mei, Agu, Okt, Des). Empty string if not visible.
- total_idr: integer Rupiah taken STRICTLY from the final "Total" row. NEVER use Subtotal, Cash, Change, Kembalian, Tunai,
  Discount, Tax or item prices. Indonesian format uses "." as thousands separator: "Rp. 110.000" -> 110000. 0 if not visible.
- confidence: 0..1 — your confidence that ALL fields are correct AND the receipt is genuine and unedited.
  Lower it for blur, cropping of the header/Receipt Number/Total, signs of digital editing, or screens instead of paper.`;

function parseJsonLoose(text: string): Partial<VisionReceipt> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new VisionFailedError("Vision model returned no JSON");
  const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  return {
    is_smashing_receipt: obj.is_smashing_receipt === true,
    receipt_number: typeof obj.receipt_number === "string" ? obj.receipt_number : "",
    receipt_date: typeof obj.receipt_date === "string" ? obj.receipt_date : "",
    total_idr:
      typeof obj.total_idr === "number"
        ? obj.total_idr
        : (obj.total_idr as unknown as number) ?? 0,
    confidence: typeof obj.confidence === "number" ? obj.confidence : Number(obj.confidence ?? 0),
  };
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(base64: string, mediaType: string, key: string): Promise<Partial<VisionReceipt>> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await withTimeout(20_000, (signal) =>
    fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaType, data: base64 } }, { text: PROMPT }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_smashing_receipt: { type: "BOOLEAN" },
              receipt_number: { type: "STRING" },
              receipt_date: { type: "STRING" },
              total_idr: { type: "INTEGER" },
              confidence: { type: "NUMBER" },
            },
            required: ["is_smashing_receipt", "receipt_number", "receipt_date", "total_idr", "confidence"],
          },
        },
      }),
    }),
  );
  if (!res.ok) throw new VisionFailedError(`Gemini HTTP ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseJsonLoose(text);
}

async function callAnthropic(base64: string, mediaType: string, key: string): Promise<Partial<VisionReceipt>> {
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const res = await withTimeout(20_000, (signal) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system: "You extract structured data from receipt photos and reply with a single JSON object only.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    }),
  );
  if (!res.ok) throw new VisionFailedError(`Anthropic HTTP ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "");
  return parseJsonLoose(text);
}

export function visionProvider(): "gemini" | "anthropic" | null {
  const forced = process.env.VISION_PROVIDER?.toLowerCase();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  if (forced === "gemini" && hasGemini) return "gemini";
  if (forced === "anthropic" && hasAnthropic) return "anthropic";
  if (hasGemini) return "gemini";
  if (hasAnthropic) return "anthropic";
  return null;
}

/** dataUrl: "data:image/jpeg;base64,...." */
export async function extractMokaReceipt(dataUrl: string): Promise<Partial<VisionReceipt>> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new VisionFailedError("Invalid image payload");
  const [, mediaType, base64] = match;
  const provider = visionProvider();
  if (provider === "gemini") return callGemini(base64, mediaType, process.env.GEMINI_API_KEY as string);
  if (provider === "anthropic") return callAnthropic(base64, mediaType, process.env.ANTHROPIC_API_KEY as string);
  throw new VisionUnavailableError("No vision provider configured");
}
