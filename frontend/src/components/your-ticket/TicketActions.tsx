/**
 * components/your-ticket/TicketActions.tsx
 *
 * "Add to Apple Wallet" primary action, and a "Share Event Details" link
 * underneath. Matches your_ticket Stitch markup. The PDF ticket download
 * button was removed with the PDF ticket generator (plan decision 16): a
 * PDF can only carry a frozen QR, which contradicts the whole rotating-QR
 * design, and generateTicketPdf.ts also shipped the ticket payload to a
 * third party (api.qrserver.com). Handlers are passed in — actual Wallet
 * pass generation is a backend/Go concern, not implemented here yet.
 */

import { Smartphone, Share2 } from "lucide-react";

interface TicketActionsProps {
  on_add_to_wallet?: () => void;
  on_add_shortcut?: () => void;
  on_share: () => void;
}

export function TicketActions({
  on_add_to_wallet,
  on_add_shortcut,
  on_share,
}: TicketActionsProps) {
  const handleShortcutClick = on_add_shortcut || on_add_to_wallet || (() => {
    alert("📱 Add Shortcut to Home Screen:\n\n1. Tap your browser menu (3 dots or Share icon).\n2. Tap 'Add to Home Screen'.\n3. Access your CrowdFlow ticket in 1 tap!");
  });

  return (
    <>
      <div className="mt-8 flex w-full max-w-[420px] flex-col gap-3">
        <button
          type="button"
          onClick={handleShortcutClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#000000] py-3.5 font-label-md text-label-md text-surface-white shadow-sm transition-colors hover:bg-[#111111]"
        >
          <Smartphone size={20} />
          Add Shortcut to Home Screen
        </button>
      </div>

      <div className="mt-stack-lg text-center">
        <p className="mb-2 font-body-sm text-body-sm text-text-secondary">
          Going with friends?
        </p>
        <button
          type="button"
          onClick={on_share}
          className="mx-auto flex items-center justify-center gap-1 font-label-md text-label-md text-secondary transition-colors hover:text-on-secondary-fixed-variant"
        >
          <Share2 size={18} />
          Share Event Details
        </button>
      </div>
    </>
  );
}