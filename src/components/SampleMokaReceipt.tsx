import type { DemoReceipt } from "@/lib/demo";

function rp(n: number): string {
  return `Rp. ${Math.round(n).toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!y || !m || !d) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0 break-words">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}

export function SampleMokaReceipt({ receipt, className = "" }: { receipt: DemoReceipt; className?: string }) {
  const subtotal = receipt.items.reduce((s, i) => s + i.priceIdr, 0) || receipt.totalIdr;
  const cash = Math.ceil(receipt.totalIdr / 50_000) * 50_000;
  const change = cash - receipt.totalIdr;

  return (
    <div className={`relative w-full text-[#222] ${className}`} style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))" }}>
      <div
        className="bg-[#fbfaf6] px-3 pb-2 pt-3 text-[9px] leading-[1.35] sm:text-[10px]"
        style={{ fontFamily: "ui-monospace, 'Courier New', monospace" }}
      >
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/smashing-logo-mark.png" alt="" className="h-8 w-8 object-contain grayscale" />
          <div className="mt-1 text-[12px] font-bold tracking-wider">SMASHING BURGER</div>
          <div>Jakarta</div>
        </div>
        <div className="my-2 border-t border-dashed border-[#999]" />
        <Row left="Receipt Number" right={receipt.receiptNumber} bold />
        <Row left="Date" right={formatDate(receipt.receiptDate)} />
        <Row left="Time" right="19:42" />
        <Row left="Cashier" right="Dewi" />
        <Row left="Type" right="Dine In" />
        <div className="my-2 border-t border-dashed border-[#999]" />
        {receipt.items.map((it) => (
          <div key={it.name} className="mb-1">
            <div>{it.name}</div>
            <Row left={`  ${it.qty} x`} right={rp(it.priceIdr)} />
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-[#999]" />
        <Row left="Subtotal" right={rp(subtotal)} />
        <div className="mt-1 text-[11px]">
          <Row left="Total" right={rp(receipt.totalIdr)} bold />
        </div>
        <Row left="Cash" right={rp(cash)} />
        <Row left="Change" right={rp(change)} />
        <div className="my-2 border-t border-dashed border-[#999]" />
        <div className="text-center">Thank you for dining with us!</div>
        <div className="mt-1 text-center text-[8px] text-[#666]">Powered by Moka</div>
      </div>
      <svg aria-hidden className="block h-[7px] w-full" preserveAspectRatio="none" viewBox="0 0 100 7">
        <defs>
          <pattern id="sb-zig" width="6" height="7" patternUnits="userSpaceOnUse">
            <polygon points="0,0 6,0 3,7" fill="#fbfaf6" />
          </pattern>
        </defs>
        <rect width="100" height="7" fill="url(#sb-zig)" />
      </svg>
    </div>
  );
}
