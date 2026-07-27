"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Lock, ShieldCheck, ShieldAlert, Check } from "lucide-react";
import {
  getPayoutDetails,
  updatePayoutDetails,
  type PayoutDetails,
} from "@/lib/api/eorganizer";

// The organizer's payout bank account. One account per organizer — it funds
// every event's payout — so this lives in Settings rather than in an event
// workspace.
//
// It locks once committed: an event under review, or a payout in flight. The
// backend re-checks that on save, so a stale form cannot slip a change past it;
// this component only mirrors the state so the reason is visible.

// Show only the last four digits of a stored account number. The full value is
// still in the input when editing; this is for the read-only summary.
function maskAccount(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${"•".repeat(Math.min(digits.length - 4, 12))}${digits.slice(-4)}`;
}

export default function PayoutDetailsCard() {
  const [details, setDetails] = useState<PayoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getPayoutDetails();
    if (res.success && res.data) {
      setDetails(res.data);
      setBankName(res.data.bankName);
      setHolder(res.data.bankAccountHolder);
      setAccountNumber(res.data.bankAccountNumber);
    } else {
      setError(res.error?.message ?? "Failed to load payout details");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await updatePayoutDetails({
      bankName,
      bankAccountHolder: holder,
      bankAccountNumber: accountNumber,
    });
    if (res.success && res.data) {
      setDetails(res.data);
      setBankName(res.data.bankName);
      setHolder(res.data.bankAccountHolder);
      setAccountNumber(res.data.bankAccountNumber);
      setSaved(true);
    } else {
      setError(res.error?.message ?? "Failed to save payout details");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-container" />;
  }

  const locked = details ? !details.editable : false;
  const verified = details?.verificationStatus === "verified";
  const dirty =
    !!details &&
    (bankName !== details.bankName ||
      holder !== details.bankAccountHolder ||
      accountNumber !== details.bankAccountNumber);

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Landmark className="h-4 w-4 text-secondary" />
            <span>Payout Bank Account</span>
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Where CrowdFlow sends your revenue. Used for every event you organise.
          </p>
        </div>

        {details?.complete && (
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              verified
                ? "border-success/20 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {verified ? "Verified" : "Awaiting re-verification"}
          </span>
        )}
      </div>

      {/* An incomplete account blocks event submission, so say so before the
          organizer discovers it at the publish step. */}
      {!details?.complete && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
          <strong className="font-bold">Required before submitting an event.</strong> You cannot send an
          event for review until these details are on file.
        </div>
      )}

      {!verified && details?.complete && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
          An auditor will re-check this account before your next payout is approved.
        </div>
      )}

      {locked && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2.5 text-xs text-text-secondary">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{details?.lockReason}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {saved && !dirty && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2.5 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5" />
          Payout details saved.
        </div>
      )}

      {locked ? (
        // Read-only summary. The account number is masked: it is the one field
        // here whose exposure enables a redirect, and it needs no re-reading.
        <dl className="mt-4 space-y-2 text-xs">
          {[
            { label: "Bank", value: details?.bankName },
            { label: "Account Holder", value: details?.bankAccountHolder },
            { label: "Account Number", value: maskAccount(details?.bankAccountNumber ?? "") },
          ].map((row) => (
            <div key={row.label} className="flex justify-between border-b border-border-subtle pb-1.5">
              <dt className="text-text-secondary">{row.label}</dt>
              <dd className="text-right font-semibold text-text-primary">
                {row.value?.trim() ? row.value : <span className="font-normal italic text-text-secondary">Not provided</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="payout-bank-name" className="text-[9px] font-mono font-bold uppercase text-text-secondary">
              Bank Name
            </label>
            <input
              id="payout-bank-name"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Bank Central Asia (BCA)"
              className="h-9 w-full rounded-lg border border-border-subtle bg-white px-3 text-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
            <p className="text-[10px] text-text-secondary">
              Write the bank&apos;s full name as it appears on your account.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="payout-holder" className="text-[9px] font-mono font-bold uppercase text-text-secondary">
              Account Holder Name
            </label>
            <input
              id="payout-holder"
              required
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Exactly as printed on the account"
              className="h-9 w-full rounded-lg border border-border-subtle bg-white px-3 text-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
            <p className="text-[10px] text-text-secondary">
              Must match the account exactly, or the bank will reject the transfer.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="payout-account-number" className="text-[9px] font-mono font-bold uppercase text-text-secondary">
              Account Number
            </label>
            <input
              id="payout-account-number"
              required
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="8024927501"
              className="h-9 w-full rounded-lg border border-border-subtle bg-white px-3 font-mono text-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
            <p className="text-[10px] text-text-secondary">
              Digits only, 8–20 characters. Spaces and dashes are removed automatically.
            </p>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-[10px] leading-relaxed text-text-secondary">
            Once you submit an event for review, this account is locked and every payout for that event
            goes here. Saving a change resets verification, and an auditor must re-check the account
            before your next payout is approved.
          </div>

          <button
            type="submit"
            disabled={saving || !dirty}
            className="w-full rounded-lg bg-secondary py-2 text-xs font-bold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : dirty ? "Save payout details" : "No changes to save"}
          </button>
        </form>
      )}

      {details?.updatedAt && (
        <p className="mt-3 text-[10px] text-text-secondary">
          Last updated {new Date(details.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
