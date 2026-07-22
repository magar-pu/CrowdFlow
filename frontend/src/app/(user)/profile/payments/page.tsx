"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserCircle,
  Shield,
  BadgeCheck,
  Ticket,
  Clock,
  Tag,
  Wallet,
  Bell,
  CreditCard,
  ArrowUpRight,
  Plus,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Clock3,
  ArrowDownLeft,
  ArrowUpRight as ArrowUp,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BankAccountManager } from "@/components/profile/BankAccountManager";
import { formatIDR } from "@/lib/pricing";

type TransactionFilter = "all" | "purchases" | "refunds" | "resale";

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  subText: string;
  type: "purchase" | "refund" | "resale";
  amount: number;
  isCredit: boolean;
  status: "Completed" | "Pending" | "Failed";
}

const MOCK_TRANSACTIONS: TransactionRow[] = [
  {
    id: "tx_01",
    date: "Oct 24, 2024",
    description: "Java Jazz Festival 2024",
    subText: "Order #CF-20241024",
    type: "purchase",
    amount: 2400000,
    isCredit: false,
    status: "Completed",
  },
  {
    id: "tx_02",
    date: "Oct 20, 2024",
    description: "Coldplay: Music of the Spheres",
    subText: "Refund Request #REF-1020",
    type: "refund",
    amount: 350000,
    isCredit: true,
    status: "Pending",
  },
  {
    id: "tx_03",
    date: "Oct 18, 2024",
    description: "Ed Sheeran: Mathematics Tour",
    subText: "Resale Payout",
    type: "resale",
    amount: 1500000,
    isCredit: true,
    status: "Completed",
  },
];

export default function WalletTransactionsPage() {
  const [filter, setFilter] = useState<TransactionFilter>("all");

  const filteredTransactions = MOCK_TRANSACTIONS.filter((t) => {
    if (filter === "all") return true;
    if (filter === "purchases") return t.type === "purchase";
    if (filter === "refunds") return t.type === "refund";
    if (filter === "resale") return t.type === "resale";
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <Navbar active_href="/profile" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Left Sidebar Submenu */}
          <aside className="w-full shrink-0 md:w-60">
            <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-xs space-y-6">
              {/* ACCOUNT */}
              <div>
                <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block px-3 mb-2">
                  ACCOUNT
                </span>
                <nav className="space-y-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <UserCircle size={16} /> Profile
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Shield size={16} /> Security
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <BadgeCheck size={16} /> Verification
                  </Link>
                </nav>
              </div>

              {/* TICKETS */}
              <div>
                <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block px-3 mb-2">
                  TICKETS
                </span>
                <nav className="space-y-1">
                  <Link
                    href="/orders"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Ticket size={16} /> My Tickets
                  </Link>
                  <Link
                    href="/profile/history"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Clock size={16} /> Purchase History
                  </Link>
                  <Link
                    href="/resale/my-listings"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Tag size={16} /> Resale History
                  </Link>
                </nav>
              </div>

              {/* FINANCIAL */}
              <div>
                <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block px-3 mb-2">
                  FINANCIAL
                </span>
                <nav className="space-y-1">
                  <Link
                    href="/profile/payments"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-primary bg-primary/10 rounded-xl transition-colors"
                  >
                    <Wallet size={16} /> Wallet &amp; Transactions
                  </Link>
                </nav>
              </div>

              {/* PREFERENCES */}
              <div>
                <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block px-3 mb-2">
                  PREFERENCES
                </span>
                <nav className="space-y-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Bell size={16} /> Notifications
                  </Link>
                  <Link
                    href="/profile/payments"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text-secondary rounded-xl hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <CreditCard size={16} /> Saved Payment Methods
                  </Link>
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Header Title */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Wallet &amp; Transactions
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Manage your funds, view transaction history, and track refunds.
              </p>
            </div>

            {/* Top Cards Section */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Main Balance Hero Card */}
              <div className="md:col-span-2 rounded-2xl border border-primary/20 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">
                      TOTAL BALANCE
                    </span>
                    <h2 className="text-3xl font-black text-text-primary tracking-tight mt-1">
                      Rp 350.000
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-white border border-border-subtle px-4 py-2 text-xs font-bold text-text-primary shadow-xs hover:bg-surface transition-all cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border-subtle/50 pt-4">
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                      <span className="h-2 w-2 rounded-full bg-success"></span> AVAILABLE CREDITS
                    </span>
                    <span className="text-sm font-bold text-text-primary">Rp 100.000</span>
                  </div>

                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-warning">
                      <span className="h-2 w-2 rounded-full bg-warning"></span> PENDING REFUNDS
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">Rp 250.000</span>
                      <a href="#refund-tracker" className="text-[10px] font-bold text-primary hover:underline">
                        Request Refund
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right YTD Metrics Cards */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-xs flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ArrowDownLeft size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block">
                      TOTAL SPENDING YTD
                    </span>
                    <span className="text-base font-extrabold text-text-primary">Rp 4.200.000</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-subtle bg-white p-4 shadow-xs flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                    <ArrowUp size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase block">
                      RESALE REVENUE YTD
                    </span>
                    <span className="text-base font-extrabold text-text-primary">Rp 1.500.000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-base font-bold text-text-primary">Transaction History</h3>

                <div className="flex gap-1.5 bg-surface p-1 rounded-xl">
                  {(["all", "purchases", "refunds", "resale"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                        filter === tab
                          ? "bg-black text-white shadow-xs"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-[10px] font-bold text-text-secondary uppercase">
                      <th className="py-3 px-2">DATE</th>
                      <th className="py-3 px-2">DESCRIPTION</th>
                      <th className="py-3 px-2">TYPE</th>
                      <th className="py-3 px-2 text-right">AMOUNT</th>
                      <th className="py-3 px-2 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3.5 px-2 text-text-secondary font-medium whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className="font-bold text-text-primary block">{tx.description}</span>
                          <span className="text-[10px] font-mono text-text-secondary">{tx.subText}</span>
                        </td>
                        <td className="py-3.5 px-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary capitalize">
                            {tx.type === "purchase" && "🛒 Purchase"}
                            {tx.type === "refund" && "🔄 Refund"}
                            {tx.type === "resale" && "💸 Resale"}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-2 text-right font-extrabold whitespace-nowrap ${
                            tx.isCredit ? "text-success" : "text-text-primary"
                          }`}
                        >
                          {tx.isCredit ? "+" : "-"}
                          {formatIDR(tx.amount)}
                        </td>
                        <td className="py-3.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              tx.status === "Completed"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-center border-t border-border-subtle pt-3">
                <Link
                  href="/profile/history"
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  View All Transactions <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* Bottom 2 Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2" id="refund-tracker">
              {/* Active Refund Tracker */}
              <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-warning" /> Active Refund Tracker
                    </h4>
                    <span className="text-[10px] font-mono text-text-secondary">#REF-1020</span>
                  </div>

                  <div className="mt-3">
                    <span className="text-xs font-bold text-text-primary block">
                      Coldplay: Music of the Spheres
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      Requested Oct 20, 2024 • Rp 350.000
                    </span>
                  </div>

                  {/* Step Progress Tracker */}
                  <div className="mt-6">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 top-1/2 h-0.5 w-full bg-border-subtle -translate-y-1/2 z-0"></div>
                      <div className="absolute left-0 top-1/2 h-0.5 w-1/3 bg-primary -translate-y-1/2 z-0"></div>

                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                        <RefreshCw size={12} className="animate-spin" />
                      </div>
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border-subtle text-text-secondary text-[10px] font-bold">
                        3
                      </div>
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border-subtle text-text-secondary text-[10px] font-bold">
                        4
                      </div>
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] font-semibold text-text-secondary">
                      <span className="text-primary font-bold">Submitted</span>
                      <span className="text-primary font-bold">Verifying</span>
                      <span>Approved</span>
                      <span>Refunded</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-border-subtle text-center">
                  <span className="text-[10px] text-text-secondary">
                    Estimated completion: <strong className="text-text-primary">Oct 28, 2024</strong>
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-text-primary">Payment Methods</h4>
                  <button
                    type="button"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>

                {/* Saved Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-primary/40 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-12 items-center justify-center rounded bg-blue-950 font-bold text-white text-[10px] tracking-wider">
                        VISA
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">Visa ending in 4231</span>
                          <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                            DEFAULT
                          </span>
                        </div>
                        <span className="text-[10px] text-text-secondary">Expires 12/28</span>
                      </div>
                    </div>
                    <button type="button" className="text-text-secondary hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-12 items-center justify-center rounded bg-red-600 font-bold text-white text-[9px] tracking-wider">
                        MASTER
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-primary block">Mastercard ending in 8892</span>
                        <span className="text-[10px] text-text-secondary">Expires 08/25</span>
                      </div>
                    </div>
                    <button type="button" className="text-text-secondary hover:text-text-primary p-1">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                {/* Bank Account Manager */}
                <div className="pt-2 border-t border-border-subtle">
                  <BankAccountManager />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
