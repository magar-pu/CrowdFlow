/**
 * components/your-ticket/TicketActions.tsx
 *
 * "Add to Apple Wallet" + "Download PDF Ticket" primary actions, and a
 * "Share Event Details" link underneath. Matches your_ticket Stitch
 * markup exactly. Handlers are passed in — actual Wallet pass generation
 * and PDF export are backend/Go concerns, not implemented here yet.
 */

import { Wallet, Download, Share2 } from "lucide-react";

interface TicketActionsProps {
  on_add_to_wallet: () => void;
  on_download_pdf: () => void;
  on_share: () => void;
}

export function TicketActions({
  on_add_to_wallet,
  on_download_pdf,
  on_share,
}: TicketActionsProps) {
  return (
    <>
      <div className="mt-8 flex w-full max-w-[420px] flex-col gap-3">
        <button
          type="button"
          onClick={on_add_to_wallet}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#000000] py-3.5 font-label-md text-label-md text-surface-white shadow-sm transition-colors hover:bg-[#111111]"
        >
          <Wallet size={20} />
          Add to Apple Wallet
        </button>
        <button
          type="button"
          onClick={on_download_pdf}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-white py-3.5 font-label-md text-label-md text-text-primary shadow-sm transition-colors hover:bg-surface-container-low"
        >
          <Download size={20} />
          Download PDF Ticket
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