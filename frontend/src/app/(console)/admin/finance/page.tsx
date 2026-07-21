"use client";

import { useEffect } from "react";
import FinanceView from "@/components/admin/finance/FinanceView";
import { useAdminData } from "../AdminDataContext";

export default function AdminFinancePage() {
  const {
    transactions,
    payouts,
    transactionsLoading,
    transactionsError,
    transactionsPage,
    setTransactionsPage,
    transactionsHasNext,
    payoutsLoading,
    payoutsError,
    payoutsPage,
    setPayoutsPage,
    payoutsHasNext,
    handleProcessPayout,
    handleRejectPayout,
    handleUpdateTransactionStatus,
  } = useAdminData();

  // Reset both lists to their first page whenever the tab is (re)opened, so a
  // deep page from a prior visit doesn't linger (matches pre-routing behavior).
  useEffect(() => {
    setTransactionsPage(0);
    setPayoutsPage(0);
  }, [setTransactionsPage, setPayoutsPage]);

  return (
    <div className="space-y-4">
      {(transactionsError || payoutsError) && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {transactionsError ?? payoutsError}
        </div>
      )}
      {transactionsLoading || payoutsLoading ? (
        <div className="py-24 text-center text-sm text-text-secondary">Loading finance data...</div>
      ) : (
        <FinanceView
          transactions={transactions}
          payouts={payouts}
          onProcessPayout={handleProcessPayout}
          onRejectPayout={handleRejectPayout}
          onUpdateTransactionStatus={handleUpdateTransactionStatus}
          transactionsPage={transactionsPage}
          transactionsHasNext={transactionsHasNext}
          onPrevTransactionsPage={() => setTransactionsPage((p) => Math.max(0, p - 1))}
          onNextTransactionsPage={() => setTransactionsPage((p) => p + 1)}
          payoutsPage={payoutsPage}
          payoutsHasNext={payoutsHasNext}
          onPrevPayoutsPage={() => setPayoutsPage((p) => Math.max(0, p - 1))}
          onNextPayoutsPage={() => setPayoutsPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
