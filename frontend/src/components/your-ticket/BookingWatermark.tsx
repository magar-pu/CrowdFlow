/**
 * M7 mitigation (plan_2026-08-30_dynamic_qr_ticketman.md, "link-forwarding
 * gap" section): a purely visual deterrent. The purchaser's name and a
 * truncated order id are rendered faintly and repeated across the booking
 * page, so a leaked screenshot still identifies which link it came from.
 * Pure CSS, no script, no third-party asset — keeps M6's "no third-party
 * scripts on /booking/*" guarantee intact.
 */

interface BookingWatermarkProps {
  purchaserName: string;
  orderIdShort: string;
}

export function BookingWatermark({ purchaserName, orderIdShort }: BookingWatermarkProps) {
  const label = `${purchaserName || "Guest"} · #${orderIdShort}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
    >
      <div
        className="absolute inset-[-20%] grid grid-cols-3 gap-16 opacity-[0.06]"
        style={{ transform: "rotate(-24deg)" }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-label-sm text-label-sm font-semibold uppercase tracking-widest text-text-primary"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
