"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search, Landmark, CheckCircle2, AlertTriangle, Clock, RefreshCw,
} from "lucide-react";
import {
  listBankVerifications,
  verifyOrganizerBankAccount,
  BankVerificationDTO,
} from "@/lib/api/auditor";

// The queue's own vocabulary. "changed" is not a column value — it is a
// verified account the organizer has edited since, which the server computes
// from bank_details_updated_at vs bank_verified_at. It is the whole reason this
// screen exists: whoever controls the organizer login controls where the money
// lands, so a moved destination has to resurface after it was already signed off.
const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "changed", label: "Changed since verified" },
  { key: "unverified", label: "Unverified" },
  { key: "verified", label: "Verified" },
] as const;

function statusBadge(item: BankVerificationDTO) {
  if (item.detailsChanged) {
    return { label: "Changed since verified", cls: "bg-warning/10 text-warning border-warning/20" };
  }
  if (item.verificationStatus === "verified") {
    return { label: "Verified", cls: "bg-success/10 text-success border-success/20" };
  }
  return { label: "Unverified", cls: "bg-secondary/10 text-secondary border-secondary/20" };
}

export default function AuditorBankVerificationsPage() {
  const [items, setItems] = useState<BankVerificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  // Keyed by applicationId so two rows can never share one spinner.
  const [verifying, setVerifying] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listBankVerifications({ status, limit: 100 });
    if (res.success) {
      setItems(res.data ?? []);
    } else {
      setError(res.error?.message || "Could not load the bank-verification queue.");
      setItems([]);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Search is client-side over the loaded page: the list is small and the
  // server already offers a search param if it ever stops being.
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) =>
        [it.organizerName, it.businessName, it.businessEmail, it.bankAccountNumber, it.bankName]
          .some((f) => (f ?? "").toLowerCase().includes(q)),
      )
    : items;

  const stats = {
    changed: items.filter((i) => i.detailsChanged).length,
    unverified: items.filter((i) => i.verificationStatus !== "verified").length,
    verified: items.filter((i) => i.verificationStatus === "verified" && !i.detailsChanged).length,
    blocked: items.filter((i) => i.pendingPayouts > 0 && (i.detailsChanged || i.verificationStatus !== "verified")).length,
  };

  const statCards = [
    { title: "Changed Since Verified", value: stats.changed, icon: AlertTriangle, accent: "text-warning bg-warning/10 border-warning/20" },
    { title: "Awaiting Verification", value: stats.unverified, icon: Clock, accent: "text-secondary bg-secondary/10 border-secondary/20" },
    { title: "Verified", value: stats.verified, icon: CheckCircle2, accent: "text-success bg-success/10 border-success/20" },
    { title: "Blocking a Payout", value: stats.blocked, icon: Landmark, accent: "text-danger bg-danger/10 border-danger/20" },
  ];

  // The account number on screen is echoed back and re-checked server-side: the
  // organizer may have edited it since this list loaded, and an auditor must not
  // end up verifying an account they never saw. A mismatch is refused, not
  // silently applied to the newer value.
  const handleVerify = async (item: BankVerificationDTO) => {
    setVerifying(item.applicationId);
    const res = await verifyOrganizerBankAccount(item.applicationId, item.bankAccountNumber);
    setVerifying(null);
    if (!res.success) {
      alert(
        res.error?.message ||
          "Could not verify this account. It may have changed since this page loaded — refresh and check the details again.",
      );
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Bank Verification</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Confirm the accounts organizer payouts are sent to. Accounts edited after a previous
            verification are listed first.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-lg text-xs font-bold text-text-secondary hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-white rounded-xl p-5 border border-border-subtle soft-shadow flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-1.5 rounded-lg border ${kpi.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="font-sans text-2xl font-bold text-text-primary">{kpi.value}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow space-y-3">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizer, business, email or account number"
            className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-secondary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                status === f.key
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-white text-text-secondary border-border-subtle hover:bg-surface-container-low"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-border-subtle rounded-xl p-10 text-center">
          <p className="text-sm font-bold text-text-primary">Loading bank accounts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-xl p-10 text-center">
          <Landmark className="w-8 h-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm font-bold text-text-primary">Nothing to verify</p>
          <p className="text-xs text-text-secondary mt-1">
            {items.length === 0
              ? "No organizer has bank details on file for this filter."
              : "No account matches your search."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border-subtle rounded-xl soft-shadow overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-surface-container-low border-b border-border-subtle">
              <tr className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-3">Organizer</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Change</th>
                <th className="px-4 py-3">Pending Payouts</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((item) => {
                const badge = statusBadge(item);
                const settled = item.verificationStatus === "verified" && !item.detailsChanged;
                return (
                  <tr key={item.applicationId} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-text-primary">{item.businessName || item.organizerName}</p>
                      <p className="text-xs text-text-secondary">{item.organizerName}</p>
                      <p className="text-[10px] text-text-secondary">{item.businessEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">{item.bankName}</p>
                      <p className="text-xs font-mono text-text-secondary">{item.bankAccountNumber}</p>
                      <p className="text-[10px] text-text-secondary">{item.bankAccountHolder}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {/* Blank on accounts grandfathered in by migration 0022,
                          which were verified by nobody — naming an actor there
                          would fabricate an audit trail. */}
                      {settled && item.verifiedBy?.trim() && (
                        <p className="text-[10px] text-text-secondary mt-1">
                          by {item.verifiedBy}
                          {item.verifiedAt?.trim() ? ` on ${item.verifiedAt}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {item.bankDetailsUpdatedAt || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${item.pendingPayouts > 0 ? "text-danger" : "text-text-secondary"}`}>
                        {item.pendingPayouts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {settled ? (
                        <span className="text-[11px] text-text-secondary">No action needed</span>
                      ) : (
                        <button
                          onClick={() => handleVerify(item)}
                          disabled={verifying === item.applicationId}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-success/30 bg-success/10 text-success rounded-lg text-[11px] font-bold hover:bg-success hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {verifying === item.applicationId ? "Verifying..." : "Mark verified"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
