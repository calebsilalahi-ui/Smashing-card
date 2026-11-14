import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { extractMokaReceipt, VisionUnavailableError } from "@/lib/vision";
import { duplicateMessage, validateReceipt } from "@/lib/moka";
import { rateLimit } from "@/lib/member";
import type { ScanErrorCode, ScanFailure, ScanResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Client compresses to < 300 KB; 1.5 MB of base64 is a generous ceiling that still blocks abuse. */
const MAX_DATA_URL_CHARS = 1_500_000;

function fail(status: number, code: ScanErrorCode, message: string, receiptNumber?: string) {
  const body: ScanFailure = { ok: false, code, message, ...(receiptNumber ? { receiptNumber } : {}) };
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  const authed = await getAuthedUser();
  if (!authed) return fail(401, "unauthorized", "Please sign in again to scan receipts.");
  const admin = getAdminSupabase();
  if (!admin) return fail(503, "server_error", "Loyalty service is not configured.");

  if (!rateLimit(`scan:${authed.user.id}`, 8, 10 * 60_000)) {
    return fail(429, "rate_limited", "Too many scans in a short time. Please wait a few minutes and try again.");
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DATA_URL_CHARS + 1024) {
    return fail(413, "payload_too_large", "Photo is too large. Please retake it.");
  }

  let image: unknown;
  try {
    ({ image } = (await req.json()) as { image?: unknown });
  } catch {
    return fail(400, "bad_request", "Invalid request.");
  }
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return fail(400, "bad_request", "No receipt photo received.");
  }
  if (image.length > MAX_DATA_URL_CHARS) {
    return fail(413, "payload_too_large", "Photo is too large. Please retake it.");
  }

  let raw;
  try {
    raw = await extractMokaReceipt(image);
  } catch (err) {
    if (err instanceof VisionUnavailableError) {
      return fail(503, "vision_unavailable", "Receipt scanning is temporarily unavailable. Please try again later.");
    }
    console.error("[scan-receipt] vision error", err instanceof Error ? err.message : err);
    return fail(502, "vision_failed", "We couldn't verify the receipt right now. Please try again.");
  }

  // Shared rules (moka.ts): authenticity, confidence ≥ 0.75, ≤ 7 days old, Total ≥ Rp 50.000,
  // stamps = min(floor(total / 50.000), 10).
  const valid = validateReceipt(raw);
  if (!valid.ok) return fail(422, valid.code, valid.message, valid.receiptNumber);

  const { data, error } = await admin.rpc("claim_moka_receipt", {
    p_user_id: authed.user.id,
    p_receipt_number: valid.receiptNumber,
    p_receipt_date: valid.receiptDate,
    p_total_idr: valid.totalIdr,
    p_stamps_earned: valid.stampsEarned,
  });
  if (error || !data) {
    console.error("[scan-receipt] rpc error", error?.message);
    return fail(500, "server_error", "Could not save your stamps. Please try again.");
  }

  const r = data as {
    ok: boolean;
    code: string;
    message?: string;
    receipt_number?: string;
    previous_stamps?: number;
    stamps?: number;
    stamps_earned?: number;
  };
  if (!r.ok) {
    const code = (r.code as ScanErrorCode) || "server_error";
    const message = code === "duplicate" ? duplicateMessage(valid.receiptNumber) : r.message || "Receipt rejected.";
    return fail(code === "duplicate" ? 409 : 422, code, message, valid.receiptNumber);
  }

  const body: ScanResponse = {
    ok: true,
    receiptNumber: valid.receiptNumber,
    receiptDate: valid.receiptDate,
    totalIdr: valid.totalIdr,
    stampsEarned: r.stamps_earned ?? valid.stampsEarned,
    previousStamps: r.previous_stamps ?? 0,
    stamps: r.stamps ?? 0,
  };
  return NextResponse.json(body);
}
