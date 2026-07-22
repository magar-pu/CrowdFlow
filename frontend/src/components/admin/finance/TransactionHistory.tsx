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
    <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary">Transaction History</h2>
          <p className="text-xs text-text-secondary">Search and review platform sales transactions.</p>
        </div>
        
        {/* Search bar inside transaction log */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-3 left-3 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by customer, event, TXID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2.5 pr-4 pl-9 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-text-secondary">
          <thead>
            <tr className="border-b border-border-subtle bg-surface text-[10px] uppercase tracking-wide text-text-secondary">
              <th className="py-3 px-4">TXID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Event Name</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Payment Method</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="transition-colors hover:bg-surface">
                <td className="py-3 px-4 font-bold text-text-primary">{tx.id}</td>
                <td className="py-3 px-4 font-semibold text-text-primary">{tx.customerName}</td>
                <td className="py-3 px-4 text-text-secondary">{tx.eventName}</td>
                <td className="py-3 px-4 font-bold text-text-primary">${tx.amount}</td>
                <td className="py-3 px-4 text-text-secondary">{tx.method}</td>
                <td className="py-3 px-4 text-xs text-text-secondary">{tx.date}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                    tx.status === 'Success' 
                      ? 'bg-success/10 text-success border-success/20' 
                      : tx.status === 'Pending' 
                      ? 'bg-warning/10 text-warning border-warning/20' 
                      : 'bg-danger/10 text-danger border-danger/20'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      tx.status === 'Success' ? 'bg-success' : tx.status === 'Pending' ? 'bg-warning' : 'bg-danger'
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
