"use client";

import Link from "next/link";
import { ChevronLeft, CreditCard, ShieldCheck, QrCode, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BankAccountManager } from "@/components/profile/BankAccountManager";

export default function PaymentsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <Navbar active_href="/profile" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Profile
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Payment Methods &amp; Accounts
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage your saved payment methods, QRIS e-wallets, and bank account for refunds and ticket payouts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main content - 2 cols */}
          <div className="space-y-6 md:col-span-2">
            {/* Bank Accounts Section */}
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
              <BankAccountManager />
            </div>

            {/* Quick Payment Options Card */}
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" /> Supported Instant Payment Gateways
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                CrowdFlow automatically supports 1-click QRIS, Instant Bank Virtual Accounts (BCA, Mandiri, BNI, BRI), and E-wallets during ticket checkout.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border-subtle bg-surface/50 text-center">
                  <QrCode className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[11px] font-bold text-text-primary">QRIS Instant</span>
                  <span className="text-[9px] text-text-secondary">All E-Wallets</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border-subtle bg-surface/50 text-center">
                  <CreditCard className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[11px] font-bold text-text-primary">Virtual Account</span>
                  <span className="text-[9px] text-text-secondary">BCA / Mandiri / BNI</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border-subtle bg-surface/50 text-center">
                  <Wallet className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[11px] font-bold text-text-primary">GoPay &amp; OVO</span>
                  <span className="text-[9px] text-text-secondary">Direct Mobile App</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border-subtle bg-surface/50 text-center">
                  <ShieldCheck className="h-6 w-6 text-primary mb-1" />
                  <span className="text-[11px] font-bold text-text-primary">Credit Card</span>
                  <span className="text-[9px] text-text-secondary">3D Secure 256-bit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar info - 1 col */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Bank-Grade Encryption</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                All financial data is processed via PCI-DSS Compliant Payment Gateways. CrowdFlow never stores full credit card information on server databases.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
