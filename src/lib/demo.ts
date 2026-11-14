/**
 * Presenter / Demo engine — runs entirely in the browser (no Supabase, no AI keys).
 * It reuses validateReceipt() from moka.ts so demo math is identical to production.
 */
import { BRAND } from "./config";
import { duplicateMessage, STAMPS_FOR_REWARD, todayWIB, validateReceipt } from "./moka";
import type { Member, RedeemResponse, ScanResponse, VisionReceipt } from "./types";

export const DEMO_STAFF_PIN = "4829";
export const DEMO_MAX_PIN_ATTEMPTS = 5;
export const DEMO_LOCKOUT_MS = 15 * 60_000;
const STORAGE_KEY = "sb-demo-state-v1";

export interface DemoReceipt {
  receiptNumber: string;
  receiptDate: string; // YYYY-MM-DD (always "today" in WIB so it passes the 7-day rule)
  totalIdr: number;
  /** Itemised lines for the sample MokaPOS receipt preview. */
  items: { name: string; qty: number; priceIdr: number }[];
}

/** Sample receipt used by "Simulate MokaPOS Scan: Rp 110.000 (+2 Stamps)". */
export function regularDemoReceipt(receiptNumber = "QGKTER5"): DemoReceipt {
  return {
    receiptNumber,
    receiptDate: todayWIB(),
    totalIdr: 110_000,
    items: [
      { name: "Smashing Double Beef", qty: 1, priceIdr: 55_000 },
      { name: "Helena Burger", qty: 1, priceIdr: 38_000 },
      { name: "Iced Lemon Tea", qty: 1, priceIdr: 17_000 },
    ],
  };
}

/** Sample receipt used by "Simulate Feast Scan: Rp 500.000 (+10 Instant Unlock)". */
export function feastDemoReceipt(receiptNumber = "FEAST10"): DemoReceipt {
  return {
    receiptNumber,
    receiptDate: todayWIB(),
    totalIdr: 500_000,
    items: [
      { name: "Smashing Double Beef", qty: 4, priceIdr: 220_000 },
      { name: "Helena Burger", qty: 4, priceIdr: 152_000 },
      { name: "Truffle Fries", qty: 3, priceIdr: 78_000 },
      { name: "Iced Lemon Tea", qty: 3, priceIdr: 50_000 },
    ],
  };
}

export interface DemoState {
  stamps: number;
  claimed: string[];
  failedPinAttempts: number;
  pinLockedUntil: string | null;
  serial: number;
}

const INITIAL: DemoState = { stamps: 0, claimed: [], failedPinAttempts: 0, pinLockedUntil: null, serial: 0 };

function read(): DemoState {
  if (typeof window === "undefined") return { ...INITIAL };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL };
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return { ...INITIAL, ...parsed, claimed: Array.isArray(parsed.claimed) ? parsed.claimed : [] };
  } catch {
    return { ...INITIAL };
  }
}

function write(state: DemoState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / storage blocked: demo still works for this page view.
  }
}

export function loadDemoState(): DemoState {
  return read();
}

export function demoMember(state: DemoState = read()): Member {
  return {
    id: "demo-member",
    email: null,
    fullName: "Demo VIP Member",
    memberCode: "SB-0001",
    stamps: state.stamps,
    pinLockedUntil: state.pinLockedUntil,
    pushOptIn: false,
  };
}

/** Runs a receipt through the exact production validation + duplicate rule. */
export function demoScan(receipt: DemoReceipt, overrides: Partial<VisionReceipt> = {}): ScanResponse {
  const state = read();
  const result = validateReceipt({
    is_smashing_receipt: true,
    receipt_number: receipt.receiptNumber,
    receipt_date: receipt.receiptDate,
    total_idr: receipt.totalIdr,
    confidence: 0.97,
    ...overrides,
  });
  if (!result.ok) return result;
  if (state.claimed.includes(result.receiptNumber)) {
    return { ok: false, code: "duplicate", message: duplicateMessage(result.receiptNumber), receiptNumber: result.receiptNumber };
  }
  const previousStamps = state.stamps;
  const next: DemoState = {
    ...state,
    stamps: previousStamps + result.stampsEarned,
    claimed: [...state.claimed, result.receiptNumber],
  };
  write(next);
  return {
    ok: true,
    receiptNumber: result.receiptNumber,
    receiptDate: result.receiptDate,
    totalIdr: result.totalIdr,
    stampsEarned: result.stampsEarned,
    previousStamps,
    stamps: next.stamps,
  };
}

function nextSerialNumber(prefix: string): string {
  const state = read();
  const serial = state.serial + 1;
  write({ ...state, serial });
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  let n = serial * 7919 + Date.now() % 100_000;
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length);
  }
  return `${prefix}${suffix}`;
}

/** Trigger 1: first run uses the hero receipt #QGKTER5; later runs use fresh receipt numbers so the demo can repeat. */
export function nextRegularDemoReceipt(): DemoReceipt {
  return read().claimed.includes("QGKTER5") ? regularDemoReceipt(nextSerialNumber("QGK")) : regularDemoReceipt();
}

/** Trigger 2: Rp 500.000 feast receipt (10 stamps — the per-receipt maximum). */
export function nextFeastDemoReceipt(): DemoReceipt {
  return read().claimed.includes("FEAST10") ? feastDemoReceipt(nextSerialNumber("FST")) : feastDemoReceipt();
}

/**
 * Trigger 3: anti-cheat. Guarantees #QGKTER5 is already on the claimed ledger (as if scanned earlier),
 * then re-submits it so the production duplicate rule fires.
 */
export function demoDuplicateTest(): ScanResponse {
  const state = read();
  if (!state.claimed.includes("QGKTER5")) write({ ...state, claimed: [...state.claimed, "QGKTER5"] });
  return demoScan(regularDemoReceipt("QGKTER5"));
}

/** Trigger 4: reset card to 0/10 and clear the claimed ledger + PIN lockout. */
export function demoReset(): DemoState {
  const fresh = { ...INITIAL };
  write(fresh);
  return fresh;
}

/** Mirrors the redeem_helena_burger RPC: 5 wrong PINs → 15-minute lockout; deducts 10, keeps rollover. */
export function demoRedeem(pin: string): RedeemResponse {
  const state = read();
  const now = Date.now();
  if (state.pinLockedUntil && Date.parse(state.pinLockedUntil) > now) {
    return { ok: false, code: "locked", message: "Too many wrong PINs. Try again in 15 minutes.", lockedUntil: state.pinLockedUntil };
  }
  if (!/^\d{4}$/.test(pin)) return { ok: false, code: "bad_request", message: "Enter the 4-digit staff PIN." };
  if (state.stamps < STAMPS_FOR_REWARD) {
    return { ok: false, code: "insufficient_stamps", message: `You need ${STAMPS_FOR_REWARD} stamps to redeem.` };
  }
  if (pin !== DEMO_STAFF_PIN) {
    const attempts = state.failedPinAttempts + 1;
    if (attempts >= DEMO_MAX_PIN_ATTEMPTS) {
      const lockedUntil = new Date(now + DEMO_LOCKOUT_MS).toISOString();
      write({ ...state, failedPinAttempts: 0, pinLockedUntil: lockedUntil });
      return { ok: false, code: "locked", message: "Too many wrong PINs. Try again in 15 minutes.", lockedUntil };
    }
    write({ ...state, failedPinAttempts: attempts, pinLockedUntil: null });
    return {
      ok: false,
      code: "invalid_pin",
      message: "Wrong staff PIN.",
      attemptsRemaining: DEMO_MAX_PIN_ATTEMPTS - attempts,
    };
  }
  const next: DemoState = { ...state, stamps: state.stamps - STAMPS_FOR_REWARD, failedPinAttempts: 0, pinLockedUntil: null };
  write(next);
  return {
    ok: true,
    redemptionId: `demo-${now}`,
    redeemedAt: new Date(now).toISOString(),
    stamps: next.stamps,
    memberCode: "SB-0001",
    fullName: "Demo VIP Member",
    rewardName: BRAND.rewardName,
  };
}

/** Demo mode is on for ?demo=true (persisted for the tab session) or when Supabase isn't configured. */
export function isDemoRequested(search: string | URLSearchParams): boolean {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const flag = params.get("demo");
  if (typeof window !== "undefined") {
    try {
      if (flag === "true" || flag === "1") window.sessionStorage.setItem("sb-demo", "1");
      if (flag === "false" || flag === "0") window.sessionStorage.removeItem("sb-demo");
      return window.sessionStorage.getItem("sb-demo") === "1";
    } catch {
      return flag === "true" || flag === "1";
    }
  }
  return flag === "true" || flag === "1";
}
