/**
 * components/your-ticket/PurchaseSuccessHeader.tsx
 *
 * Success checkmark + "You're going to {event}!" headline + payment
 * confirmation subtext. Matches your_ticket Stitch markup exactly.
 */

import { CircleCheck } from "lucide-react";
import { formatIDR } from "@/lib/pricing";

interface PurchaseSuccessHeaderProps {
  event_title: string;
  amount_paid: number;
  user_email: string;
}

export function PurchaseSuccessHeader({
  event_title,
  amount_paid,
  user_email,
}: PurchaseSuccessHeaderProps) {
  return (
    <div className="mb-stack-lg flex max-w-lg flex-col items-center text-center">
      <div className="mb-stack-sm flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CircleCheck size={40} className="text-success" />
      </div>
      <h1 className="mb-2 font-headline-lg text-headline-lg text-primary">
        You&apos;re going to {event_title}!
      </h1>
      <p className="font-body-md text-body-md text-text-secondary">
        Your payment of {formatIDR(amount_paid)}{" "}was successful. We&apos;ve
        emailed the receipt to {user_email}.
      </p>
    </div>
  );
}