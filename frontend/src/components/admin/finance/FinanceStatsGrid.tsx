"use client";

import React from 'react';
import { Landmark, Receipt, Percent, DollarSign, ArrowUpRight } from 'lucide-react';
import { Transaction, Payout } from '@/types/admin';

interface FinanceStatsGridProps {
  transactions: Transaction[];
  payouts: Payout[];
}

export default function FinanceStatsGrid({ transactions, payouts }: FinanceStatsGridProps) {
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0) + 6350000;
  const platformFees = totalVolume * 0.18;
  const resaleComms = 41280;
  const netPlatformProfit = platformFees + resaleComms;
  const totalPaidOut = payouts.filter(p => p.status === 'Processed').reduce((sum, p) => sum + p.amount, 0) + 4200000;
  const pendingPayoutsTotal = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Gross Volume */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Gross Sales</span>
          <Landmark className="h-4 w-4 text-secondary" />
        </div>
        <p className="mt-2 text-2xl font-bold text-text-primary">${totalVolume.toLocaleString()}</p>
        <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-success">
          <ArrowUpRight className="h-3 w-3" /> +18.2% vs last cycle
        </span>
      </div>

      {/* Settled wire payouts */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Settled Payouts</span>
          <Receipt className="h-4 w-4 text-success" />
        </div>
        <p className="mt-2 text-2xl font-bold text-text-primary">${totalPaidOut.toLocaleString()}</p>
        <span className="mt-1 block text-[10px] text-text-secondary">
          Organizer settlements processed
        </span>
      </div>

      {/* Net platform profit */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Platform Revenue</span>
          <Percent className="h-4 w-4 text-tertiary" />
        </div>
        <p className="mt-2 text-2xl font-bold text-text-primary">${netPlatformProfit.toLocaleString()}</p>
        <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-success">
          <ArrowUpRight className="h-3 w-3" /> 18% fee + 10% resale splits
        </span>
      </div>

      {/* Pending wire escrow */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">Pending Payouts</span>
          <DollarSign className="h-4 w-4 text-warning" />
        </div>
        <p className="mt-2 text-2xl font-bold text-text-primary">${pendingPayoutsTotal.toLocaleString()}</p>
        <span className="mt-1 block text-[10px] font-semibold text-warning">
          Validation pending
        </span>
      </div>
    </div>
  );
}
