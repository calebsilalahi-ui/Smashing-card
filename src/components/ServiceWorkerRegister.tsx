"use client";
import { useEffect } from "react";

/** Registers /sw.js (push + offline fallback). Failures are intentionally ignored. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
