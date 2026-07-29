import React, { useEffect, useState } from 'react';
import { DollarSign, Landmark, ArrowUpRight } from 'lucide-react';
import { getFinanceSummary, listPayouts, createPayoutRequest, OrganizerFinance, OrganizerPayout } from '@/lib/api/eorganizer';
import { useOrganizerData } from '../OrganizerDataContext';
import { formatIDR } from "@/lib/pricing";

export default function FinanceView() {
  const { events } = useOrganizerData();
  const [summary, setSummary] = useState<OrganizerFinance | null>(null);
  const [payouts, setPayouts] = useState<OrganizerPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    const [sumRes, payRes] = await Promise.all([
      getFinanceSummary(),
      listPayouts(),
    ]);
    if (sumRes.success && sumRes.data) {
      setSummary(sumRes.data);
    }
    if (payRes.success && payRes.data) {
      setPayouts(payRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getFinanceSummary(), listPayouts()]).then(([sumRes, payRes]) => {
      if (!isMounted) return;
      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (payRes.success && payRes.data) setPayouts(payRes.data);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestPayout = async () => {
    const activeEvents = events.filter(e => e.status !== "Archived");
    if (activeEvents.length === 0) {
      alert("No active deployments found. You must deploy an event before settlement requests.");
      return;
    }
    const targetEvent = activeEvents[0];
    const maxFunds = summary ? summary.payoutBalance : 0;
    const amountStr = prompt(`Enter withdrawal amount (Maximum: ${formatIDR(maxFunds)}):`);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid numeric payout amount.");
      return;
    }
    if (amount > maxFunds) {
      alert("Settlement request exceeds your current withdrawable balance.");
      return;
    }

    const res = await createPayoutRequest(Number(targetEvent.id), amount);
    if (res.success) {
      alert("Settlement request submitted successfully and is awaiting review.");
      setIsLoading(true);
      await fetchFinanceData();
    } else {
      alert(`Settlement request failed: ${res.error?.message || "Internal server error"}`);
    }
  };

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Finance Desk</h1>
          <p className="text-sm text-text-secondary">Review settlements, payouts history, and platform ticketing revenue balances.</p>
        </div>
        <button
          onClick={handleRequestPayout}
          disabled={isLoading || !summary || summary.payoutBalance <= 0}
          className="px-4 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 rounded-lg font-sans text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          Request Settlement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Gross Sales</span>
            <DollarSign className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-text-primary">
            Rp {summary ? summary.grossSales.toLocaleString('id-ID') : "0"}
          </span>
          <p className="text-[10px] text-on-surface-variant">Total processed tickets payment volume</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Withdrawable Funds</span>
            <Landmark className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-secondary">
            Rp {summary ? summary.payoutBalance.toLocaleString('id-ID') : "0"}
          </span>
          <p className="text-[10px] text-on-surface-variant">Net balance available for bank settlement</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Settled Payouts</span>
            <ArrowUpRight className="w-4 h-4 text-on-surface-variant" />
          </div>
          <span className="text-2xl font-bold text-success">
            Rp {summary ? (summary.netRevenue - summary.payoutBalance).toLocaleString('id-ID') : "0"}
          </span>
          <p className="text-[10px] text-on-surface-variant">Amount successfully wired to bank account</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-bold text-text-primary">Wire settlements</h3>
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
          <div className="overflow-x-auto">
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
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-xs animate-pulse">
                      Loading settlements ledger...
                    </td>
                  </tr>
                ) : payouts.map((pay) => {
                  const isProcessed = pay.status.toUpperCase() === "PROCESSED";
                  return (
                    <tr key={pay.id} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-mono text-text-secondary">PAY-{pay.id}</td>
                      <td className="p-4 font-medium text-text-primary">{pay.eventName}</td>
                      <td className="p-4 text-text-secondary">Chase Bank (•••• 9876)</td>
                      <td className="p-4 text-text-secondary">{pay.requestedAt ? pay.requestedAt.slice(0, 10) : ""}</td>
                      <td className="p-4 text-right font-semibold font-mono">Rp {pay.amount.toLocaleString('id-ID')}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold ${
                          isProcessed ? 'status-paid' : 'status-pending'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && payouts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-xs">
                      No wire settlements processed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
