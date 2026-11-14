/**
 * MokaPOS receipt business rules — pure functions shared by the server route and Presenter/Demo mode,
 * so the demo behaves exactly like production.
 */
import type { ScanFailure, VisionReceipt } from "./types";

export const STAMP_UNIT_IDR = 50_000;
export const STAMPS_FOR_REWARD = 10;
export const RECEIPT_MAX_AGE_DAYS = 7;
export const MIN_CONFIDENCE = 0.75;
/** Business rule: one receipt can never award more than 10 stamps (enforced again in Postgres). */
export const MAX_STAMPS_PER_RECEIPT = 10;

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, peb: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8, ags: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, nop: 11, november: 11, nopember: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

/**
 * Strict stamp math — non-accumulating and capped.
 * Rp 85.000 → 1, Rp 110.000 → 2, Rp 500.000 → 10, Rp 1.000.000 → 10 (max 10 per receipt).
 */
export function stampsForTotal(totalIdr: number): number {
  if (!Number.isFinite(totalIdr) || totalIdr <= 0) return 0;
  return Math.min(Math.floor(totalIdr / STAMP_UNIT_IDR), MAX_STAMPS_PER_RECEIPT);
}

/**
 * Parses Indonesian MokaPOS currency strings. Indonesian format uses "." as thousands separator and
 * "," for decimals: "Rp. 110.000" → 110000, "Rp 1.250.000,00" → 1250000.
 */
export function parseIdr(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? Math.round(input) : null;
  let s = String(input).trim().replace(/^(idr|rp)\.?\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  // Drop a trailing decimal part (",00" or ",5").
  s = s.replace(/,\d{1,2}$/, "");
  // A lone "." followed by exactly 1–2 digits at the end is a decimal (rare, English style).
  if (/^\d+\.\d{1,2}$/.test(s)) s = s.split(".")[0];
  const digits = s.replace(/[.,]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Today's date in Jakarta (WIB, UTC+7) as YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Accepts "2026-11-14", "14 Nov 2026", "14 November 2026", "14/11/2026", "14-11-26". Returns YYYY-MM-DD or null. */
export function parseReceiptDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[\s.-]+([a-z]+)\.?[\s.-]+(\d{2,4})/))) {
    d = Number(match[1]);
    m = MONTHS[match[2]] ?? MONTHS[match[2].slice(0, 3)] ?? 0;
    y = Number(match[3]);
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    // Indonesian receipts are day-first.
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  if (y < 100) y += 2000;
  if (!m || m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(`${iso}T00:00:00Z`);
  if (check.getUTCDate() !== d) return null; // e.g. 31 Feb
  return iso;
}

export function normalizeReceiptNumber(input: string | null | undefined): string {
  return String(input ?? "")
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export function formatIdr(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export interface ValidReceipt {
  ok: true;
  receiptNumber: string;
  receiptDate: string;
  totalIdr: number;
  stampsEarned: number;
}

/** Applies every MokaPOS validation rule. Order matters: authenticity → legibility → freshness → value. */
export function validateReceipt(raw: Partial<VisionReceipt>, now: Date = new Date()): ValidReceipt | ScanFailure {
  const confidence = Number(raw.confidence ?? 0);
  if (raw.is_smashing_receipt !== true) {
    return {
      ok: false,
      code: "not_smashing",
      message: "This doesn't look like a Smashing Burger MokaPOS receipt. Please scan an original Smashing Burger receipt.",
    };
  }
  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    return {
      ok: false,
      code: "low_confidence",
      message: "We couldn't read the receipt clearly. Retake the photo in good light with the header, Receipt Number and Total visible.",
    };
  }
  const receiptNumber = normalizeReceiptNumber(raw.receipt_number);
  const receiptDate = parseReceiptDate(raw.receipt_date);
  const totalIdr = parseIdr(raw.total_idr as number | string);
  if (receiptNumber.length < 4 || !receiptDate || totalIdr === null) {
    return {
      ok: false,
      code: "unreadable",
      message: "Receipt Number, date or Total could not be read. Please retake the photo.",
      receiptNumber: receiptNumber || undefined,
    };
  }
  const today = todayWIB(now);
  const age = daysBetween(receiptDate, today);
  if (age < -1) {
    return { ok: false, code: "future_date", message: "The receipt date is in the future. Please scan a valid receipt.", receiptNumber };
  }
  if (age > RECEIPT_MAX_AGE_DAYS) {
    return {
      ok: false,
      code: "too_old",
      message: `Receipt #${receiptNumber} is older than ${RECEIPT_MAX_AGE_DAYS} days and can no longer earn stamps.`,
      receiptNumber,
    };
  }
  if (totalIdr < STAMP_UNIT_IDR) {
    return {
      ok: false,
      code: "below_minimum",
      message: "Minimum Rp 50.000 in one receipt to earn 1 stamp.",
      receiptNumber,
    };
  }
  return { ok: true, receiptNumber, receiptDate, totalIdr, stampsEarned: stampsForTotal(totalIdr) };
}

export function duplicateMessage(receiptNumber: string): string {
  return `Receipt #${receiptNumber} has already been claimed!`;
}
