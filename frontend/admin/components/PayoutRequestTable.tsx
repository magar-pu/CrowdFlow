"use client";

import React, { useState } from 'react';
import { X, ShieldCheck, Receipt } from 'lucide-react';
import { Transaction, Payout } from '../types';

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
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Organizer Settlement Desk</h2>
            <p className="text-xs text-slate-400">Validate compliance and execute direct wire payouts to organizers.</p>
          </div>
          
          {/* Tab switch */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 self-start sm:self-center">
            <button
              onClick={() => setPayoutTab('payouts')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                payoutTab === 'payouts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Payout Queue
            </button>
            <button
              onClick={() => setPayoutTab('refunds')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                payoutTab === 'refunds' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Refund Desk
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {payoutTab === 'payouts' ? (
            pendingPayouts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">All organizer payout files processed.</p>
                <p className="text-xs text-slate-500 mt-1">Stripe Custom Connect automated ledgers matched completely.</p>
              </div>
            ) : (
              pendingPayouts.map((payout) => (
                <div key={payout.id} className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-200">{payout.organizerName}</h4>
                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono text-indigo-400 border border-indigo-500/20 uppercase">
                        {payout.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Event: <span className="text-slate-300 font-medium">{payout.eventName}</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Wire Requested Date: {payout.requestedDate}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-white">${payout.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onProcessPayout(payout.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-2xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        Process Wire
                      </button>
                      <button
                        onClick={() => onRejectPayout(payout.id)}
                        className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-400 hover:text-rose-455 hover:bg-rose-500/5 transition-all cursor-pointer"
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
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                <Receipt className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Zero pending refund requests.</p>
                <p className="text-xs text-slate-500 mt-1">Excellent job! Refunds compliance ledger matched.</p>
              </div>
            ) : (
              pendingRefunds.map((tx) => (
                <div key={tx.id} className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-200">{tx.customerName}</h4>
                      <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-mono text-rose-400 border border-rose-500/20 uppercase">
                        {tx.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Requested Refund on: <span className="text-slate-300 font-medium">{tx.eventName}</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Purchased Date: {tx.date}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-white">${tx.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdateTransactionStatus(tx.id, 'Refunded')}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-2xs font-bold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                      >
                        Approve Refund
                      </button>
                      <button
                        onClick={() => onUpdateTransactionStatus(tx.id, 'Success')}
                        className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer"
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
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-base font-bold text-white">Payment Method Splits</h2>
        <p className="text-xs text-slate-400">Trading volume contribution by client payment method.</p>

        <div className="mt-6 space-y-4">
          {[
            { name: 'Apple Pay (Mobile)', volume: totalVolume * 0.41, percentage: 41, color: 'bg-indigo-500' },
            { name: 'Credit Cards (Visa/Mastercard)', volume: totalVolume * 0.38, percentage: 38, color: 'bg-pink-500' },
            { name: 'Bank Wire Transfer', volume: totalVolume * 0.12, percentage: 12, color: 'bg-cyan-500' },
            { name: 'Cryptocurrency (USDT/USDC)', volume: totalVolume * 0.09, percentage: 9, color: 'bg-amber-500' }
          ].map((method, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{method.name}</span>
                <span className="font-mono text-slate-400 font-bold">${Math.round(method.volume / 1000).toLocaleString()}K ({method.percentage}%)</span>
              </div>
              <div className="h-1.5 w-full rounded bg-slate-900 overflow-hidden">
                <div className={`h-full ${method.color}`} style={{ width: `${method.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
