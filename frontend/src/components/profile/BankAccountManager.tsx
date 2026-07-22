"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, CreditCard, Building2, UserCircle } from "lucide-react";
import { BankAccount, getBankAccounts, addBankAccount } from "@/lib/api/bankAccounts";

export function BankAccountManager() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    account_holder_name: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const res = await getBankAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
      } else {
        setError(res.error?.message || "Failed to load bank accounts.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await addBankAccount(form);
      if (res.success && res.data) {
        setAccounts([res.data, ...accounts]);
        setIsAdding(false);
        setForm({
          bank_name: "",
          account_number: "",
          account_holder_name: "",
        });
      } else {
        setError(res.error?.message || "Failed to add bank account.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white shadow-sm p-6 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-text-primary" />
          <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
            Bank Accounts
          </h3>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 font-label-sm text-label-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Plus size={14} />
            Add Account
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger">
            {error}
          </div>
        )}

        {isAdding && (
          <div className="mb-6 rounded-xl border border-border-subtle bg-surface-container-lowest p-5">
            <h4 className="mb-4 font-label-md text-label-md font-semibold text-text-primary">
              Add New Bank Account
            </h4>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                    Bank Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-text-secondary" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. BCA, Mandiri"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full rounded-lg border border-border-subtle bg-white py-2.5 pl-10 pr-4 font-body-md text-body-md text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                    Account Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 h-5 w-5 text-text-secondary" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1234567890"
                      value={form.account_number}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      className="w-full rounded-lg border border-border-subtle bg-white py-2.5 pl-10 pr-4 font-body-md text-body-md text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                    Account Holder Name
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-text-secondary" />
                    <input
                      type="text"
                      required
                      placeholder="Full Name as on Bank Account"
                      value={form.account_holder_name}
                      onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
                      className="w-full rounded-lg border border-border-subtle bg-white py-2.5 pl-10 pr-4 font-body-md text-body-md text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg px-4 py-2 font-label-md text-label-md font-semibold text-text-secondary transition-colors hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-5 py-2 font-label-md text-label-md font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {accounts.length === 0 && !isAdding ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-container-lowest py-8 text-center">
              <CreditCard className="mb-2 h-8 w-8 text-text-secondary opacity-50" />
              <p className="font-body-md text-body-md text-text-secondary">
                No bank accounts added yet.
              </p>
              <p className="mt-1 font-body-sm text-body-sm text-text-secondary/70">
                You need a verified bank account to receive resale payouts.
              </p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border-subtle bg-white p-4 shadow-sm transition-all hover:border-primary/30"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-label-lg text-label-lg font-bold text-text-primary">
                      {acc.bank_name} <span className="font-normal text-text-secondary text-sm ml-1">• {acc.account_number.slice(-4).padStart(acc.account_number.length, '*')}</span>
                    </h4>
                    <p className="mt-0.5 font-body-sm text-body-sm text-text-secondary">
                      {acc.account_holder_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {acc.is_verified ? (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 font-label-sm text-label-sm font-semibold text-success">
                      <CheckCircle size={14} />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 font-label-sm text-label-sm font-semibold text-warning-dark">
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
