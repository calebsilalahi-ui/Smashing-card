/** Shared contracts between the API routes and the UI. */

export interface Member {
  id: string;
  email: string | null;
  fullName: string;
  /** Display code, e.g. "SB-0042" (render with a leading "#"). */
  memberCode: string;
  /** Uncapped stamp balance. 10+ means the Helena Burger reward is unlocked; extra stamps roll over. */
  stamps: number;
  /** ISO timestamp while the member is locked out of PIN entry, otherwise null. */
  pinLockedUntil: string | null;
  pushOptIn: boolean;
}

/** Raw structured output requested from the Vision model. */
export interface VisionReceipt {
  is_smashing_receipt: boolean;
  receipt_number: string;
  receipt_date: string;
  total_idr: number;
  confidence: number;
}

export type ScanErrorCode =
  | "unauthorized"
  | "bad_request"
  | "payload_too_large"
  | "not_smashing"
  | "low_confidence"
  | "unreadable"
  | "too_old"
  | "future_date"
  | "below_minimum"
  | "duplicate"
  | "rate_limited"
  | "vision_unavailable"
  | "vision_failed"
  | "server_error";

export interface ScanSuccess {
  ok: true;
  receiptNumber: string;
  receiptDate: string; // YYYY-MM-DD
  totalIdr: number;
  stampsEarned: number;
  previousStamps: number;
  stamps: number; // new balance
}

export interface ScanFailure {
  ok: false;
  code: ScanErrorCode;
  message: string;
  receiptNumber?: string;
}

export type ScanResponse = ScanSuccess | ScanFailure;

export type RedeemErrorCode =
  | "unauthorized"
  | "bad_request"
  | "insufficient_stamps"
  | "invalid_pin"
  | "locked"
  | "server_error";

export interface RedeemSuccess {
  ok: true;
  redemptionId: string;
  redeemedAt: string; // ISO
  stamps: number; // balance after deducting 10
  memberCode: string;
  fullName: string;
  rewardName: string;
}

export interface RedeemFailure {
  ok: false;
  code: RedeemErrorCode;
  message: string;
  attemptsRemaining?: number;
  lockedUntil?: string; // ISO
}

export type RedeemResponse = RedeemSuccess | RedeemFailure;

export type ConsentType = "terms_privacy" | "push_reminders" | "cookies_analytics" | "cookies_preferences";

export interface MeResponse {
  member: Member;
}
