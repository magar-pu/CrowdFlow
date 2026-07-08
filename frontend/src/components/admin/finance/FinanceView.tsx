"use client";

import React from 'react';
import { Transaction, Payout } from '@/types/admin';
import FinanceStatsGrid from './FinanceStatsGrid';
import PayoutRequestTable from './PayoutRequestTable';
import TransactionHistory from './TransactionHistory';

interface FinanceViewProps {
  transactions: Transaction[];
  payouts: Payout[];
  onProcessPayout: (id: string) => void;
  onRejectPayout: (id: string) => void;
  onUpdateTransactionStatus: (id: string, newStatus: 'Success' | 'Refunded') => void;
}

export default function FinanceView({
  transactions,
  payouts,
  onProcessPayout,
  onRejectPayout,
  onUpdateTransactionStatus
}: FinanceViewProps) {
  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0) + 6350000;

  return (
    <div className="space-y-6">
      {/* Finance Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">Finance Center</h1>
          <p className="mt-2 text-sm text-text-secondary">Review sales volume, organizer payouts, and refund requests.</p>
        </div>
        <button
          onClick={() => alert('Generating financial statement summary.')}
          className="min-h-11 rounded-lg border border-border-subtle bg-surface-white px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-surface cursor-pointer"
        >
          Export Balance Sheet
        </button>
      </div>

      {/* Financial KPIs Grid */}
      <FinanceStatsGrid transactions={transactions} payouts={payouts} />

      {/* Organizer Settlements & Payment Splits */}
      <PayoutRequestTable 
        transactions={transactions} 
        payouts={payouts}
        onProcessPayout={onProcessPayout}
        onRejectPayout={onRejectPayout}
        onUpdateTransactionStatus={onUpdateTransactionStatus}
        totalVolume={totalVolume}
      />

      {/* Master Transaction Log */}
      <TransactionHistory transactions={transactions} />
    </div>
  );
}
