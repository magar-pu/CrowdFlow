"use client";

import React, { useState } from 'react';
import { X, ShieldCheck, Receipt } from 'lucide-react';
import { Transaction, Payout } from '@/types/admin';

interface PayoutRequestTableProps {
  transactions: Transaction[];
  payouts: Payout[];
  onProcessPayout: (id: string) => void;
  onRejectPayout: (id: string) => void;
  onUpdateTransactionStatus: (id: string, newStatus: 'Success' | 'Refunded') => void;
  totalVolume: number;
}

export default function PayoutRequestTable({
  transactions,
  payouts,
  onProcessPayout,
  onRejectPayout,
  onUpdateTransactionStatus,
  totalVolume
}: PayoutRequestTableProps) {
  const [payoutTab, setPayoutTab] = useState<'payouts' | 'refunds'>('payouts');

  const pendingPayouts = payouts.filter(p => p.status === 'Pending');
  const pendingRefunds = transactions.filter(t => t.status === 'Pending');

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Settlement Desk Panel */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Organizer Settlements</h2>
            <p className="text-xs text-text-secondary">Validate and process organizer payout requests.</p>
          </div>
          
          {/* Tab switch */}
          <div className="flex self-start rounded-lg border border-border-subtle bg-surface p-1 sm:self-center">
            <button
              onClick={() => setPayoutTab('payouts')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                payoutTab === 'payouts' ? 'bg-primary text-on-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Payout Queue
            </button>
            <button
              onClick={() => setPayoutTab('refunds')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                payoutTab === 'refunds' ? 'bg-primary text-on-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Refund Desk
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {payoutTab === 'payouts' ? (
            pendingPayouts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle bg-surface py-12 text-center text-text-secondary">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
                <p className="text-sm font-semibold text-text-primary">All organizer payout requests are processed.</p>
                <p className="mt-1 text-xs text-text-secondary">No pending payout requests.</p>
              </div>
            ) : (
              pendingPayouts.map((payout) => (
                <div key={payout.id} className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">{payout.organizerName}</h4>
                      <span className="rounded-full border border-secondary/20 bg-secondary/5 px-1.5 py-0.5 text-[9px] font-medium uppercase text-secondary">
                        {payout.id}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Event: <span className="font-medium text-text-primary">{payout.eventName}</span></p>
                    <p className="mt-0.5 text-[10px] text-text-secondary">Requested date: {payout.requestedDate}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-text-primary">${payout.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onProcessPayout(payout.id)}
                        className="rounded-lg bg-success px-3 py-1.5 text-[10px] font-bold text-on-success transition-colors hover:bg-success/90 cursor-pointer"
                      >
                        Process
                      </button>
                      <button
                        onClick={() => onRejectPayout(payout.id)}
                        className="rounded-lg border border-border-subtle bg-surface-white p-1.5 text-text-secondary transition-all hover:bg-danger/5 hover:text-danger cursor-pointer"
                        title="Reject payout request"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            pendingRefunds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle bg-surface py-12 text-center text-text-secondary">
                <Receipt className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
                <p className="text-sm font-semibold text-text-primary">No pending refund requests.</p>
                <p className="mt-1 text-xs text-text-secondary">Refund queue is clear.</p>
              </div>
            ) : (
              pendingRefunds.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">{tx.customerName}</h4>
                      <span className="rounded-full border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-danger">
                        {tx.id}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Requested refund on: <span className="font-medium text-text-primary">{tx.eventName}</span></p>
                    <p className="mt-0.5 text-[10px] text-text-secondary">Purchased date: {tx.date}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-text-primary">${tx.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateTransactionStatus(tx.id, 'Refunded')}
                        className="rounded-lg bg-danger px-3 py-1.5 text-[10px] font-bold text-on-error transition-colors hover:bg-danger/90 cursor-pointer"
                      >
                        Approve Refund
                      </button>
                      <button
                        onClick={() => onUpdateTransactionStatus(tx.id, 'Success')}
                        className="rounded-lg border border-border-subtle bg-surface-white p-1.5 text-text-secondary transition-all hover:bg-success/5 hover:text-success cursor-pointer"
                        title="Reject and maintain transaction success"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Payment Gateway Splits Panel */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-text-primary">Payment Method Splits</h2>
        <p className="text-xs text-text-secondary">Sales volume by payment method.</p>

        <div className="mt-6 space-y-4">
          {[
            { name: 'Apple Pay (Mobile)', volume: totalVolume * 0.41, percentage: 41, color: 'bg-secondary' },
            { name: 'Credit Cards', volume: totalVolume * 0.38, percentage: 38, color: 'bg-tertiary' },
            { name: 'Bank Transfer', volume: totalVolume * 0.12, percentage: 12, color: 'bg-success' },
            { name: 'Other Methods', volume: totalVolume * 0.09, percentage: 9, color: 'bg-warning' }
          ].map((method, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-primary">{method.name}</span>
                <span className="font-bold text-text-secondary">${Math.round(method.volume / 1000).toLocaleString()}K ({method.percentage}%)</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-surface-container">
                <div className={`h-full ${method.color}`} style={{ width: `${method.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
