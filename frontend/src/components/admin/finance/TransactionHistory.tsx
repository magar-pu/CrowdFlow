"use client";

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Transaction } from '@/types/admin';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(t => 
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-base font-bold text-white">Cryptographic Transaction Ledger</h2>
          <p className="text-xs text-slate-400">Search and audit all platform sales transactions.</p>
        </div>
        
        {/* Search bar inside transaction log */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer, event, TXID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-900 bg-slate-900 px-3 pr-4 pl-9 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400 border-collapse">
          <thead>
            <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-900/10">
              <th className="py-3 px-4">TXID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Event Name</th>
              <th className="py-3 px-4">Net Flow</th>
              <th className="py-3 px-4">Payment Method</th>
              <th className="py-3 px-4">Trading Date</th>
              <th className="py-3 px-4 text-right">Verification Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-900/30 transition-colors">
                <td className="py-3 px-4 font-mono text-slate-300 font-bold">{tx.id}</td>
                <td className="py-3 px-4 text-slate-200 font-semibold">{tx.customerName}</td>
                <td className="py-3 px-4 text-slate-400">{tx.eventName}</td>
                <td className="py-3 px-4 text-slate-200 font-bold font-mono">${tx.amount}</td>
                <td className="py-3 px-4 text-slate-500">{tx.method}</td>
                <td className="py-3 px-4 text-slate-500 font-mono text-2xs">{tx.date}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                    tx.status === 'Success' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : tx.status === 'Pending' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      tx.status === 'Success' ? 'bg-emerald-400' : tx.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-455'
                    }`} />
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
