import React, { useState } from 'react';
import { DollarSign, Landmark, ArrowUpRight } from 'lucide-react';

interface PayoutRequest {
  id: string;
  eventName: string;
  amount: number;
  bankAccount: string;
  status: 'PROCESSED' | 'PENDING' | 'FAILED';
  date: string;
}

export default function FinanceView() {
  const [payouts] = useState<PayoutRequest[]>([
    { id: 'PAY-7701', eventName: 'Global Tech Summit 2024', amount: 284900, bankAccount: 'Chase Bank (•••• 9876)', status: 'PROCESSED', date: 'Oct 16, 2024' },
    { id: 'PAY-7702', eventName: 'Aurora Music Festival', amount: 315750, bankAccount: 'Chase Bank (•••• 9876)', status: 'PENDING', date: 'Nov 09, 2024' }
  ]);

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Finance Desk</h1>
        <p className="text-sm text-text-secondary">Review settlements, payouts history, and platform ticketing revenue balances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Gross Sales</span>
            <DollarSign className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-text-primary">$600,650</span>
          <p className="text-[10px] text-on-surface-variant">Total processed tickets payment volume</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Withdrawable Funds</span>
            <Landmark className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-secondary">$315,750</span>
          <p className="text-[10px] text-on-surface-variant">Net balance available for bank settlement</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Settled Payouts</span>
            <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-success">$284,900</span>
          <p className="text-[10px] text-on-surface-variant">Amount successfully wired to bank account</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-bold text-text-primary">Wire settlements</h3>
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Transfer ID</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Event Source</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Account</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Initiated At</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Amount</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {payouts.map((pay) => (
                <tr key={pay.id} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                  <td className="p-4 font-mono text-text-secondary">{pay.id}</td>
                  <td className="p-4 font-medium text-text-primary">{pay.eventName}</td>
                  <td className="p-4 text-text-secondary">{pay.bankAccount}</td>
                  <td className="p-4 text-text-secondary">{pay.date}</td>
                  <td className="p-4 text-right font-semibold font-mono">${pay.amount.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold ${
                      pay.status === 'PROCESSED'
                        ? 'status-paid'
                        : 'status-pending'
                    }`}>
                      {pay.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
