"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  Ticket,
  Search,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  CreditCard,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getMyTickets, UserTicket } from "@/lib/api/tickets";
import { formatIDR } from "@/lib/pricing";

type FilterTab = "all" | "paid" | "pending" | "refunded";

export default function PurchaseHistoryPage() {
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await getMyTickets();
        if (res.success && res.data) {
          setTickets(res.data.tickets || []);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.event_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.order_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "paid") return matchesSearch && t.status === "ready";
    if (activeTab === "refunded") return matchesSearch && t.status === "refunded";
    return matchesSearch;
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <Navbar active_href="/profile" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb & Title */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Profile
          </Link>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Purchase &amp; Transaction History
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                View all your past ticket purchases, invoices, and payment transactions.
              </p>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Ticket size={16} />
              View Digital Tickets
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border-subtle bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 border-b border-border-subtle pb-2 sm:border-0 sm:pb-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-container-high"
              }`}
            >
              All Transactions ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab("paid")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "paid"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-container-high"
              }`}
            >
              Paid / Ready
            </button>
            <button
              onClick={() => setActiveTab("refunded")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "refunded"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-container-high"
              }`}
            >
              Refunded
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event or order ID..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-border-subtle rounded-xl bg-surface focus:bg-white focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Transaction History List */}
        {loading ? (
          <div className="flex py-16 items-center justify-center text-xs text-text-secondary">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
            Loading purchase history...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-12 text-center shadow-xs">
            <Clock className="mx-auto h-12 w-12 text-text-secondary/40" />
            <h3 className="mt-4 text-base font-bold text-text-primary">No Transactions Found</h3>
            <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">
              You haven&apos;t completed any ticket purchases yet matching this filter.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-colors"
            >
              Explore Upcoming Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => (
              <div
                key={t.ticket_id}
                className="overflow-hidden rounded-2xl border border-border-subtle bg-white p-5 shadow-xs transition-all hover:border-primary/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4 items-start sm:items-center">
                    <img
                      src={t.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300"}
                      alt={t.event_title}
                      className="h-16 w-16 rounded-xl object-cover border border-border-subtle shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary uppercase">
                          {t.order_id}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.status === "ready"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {t.status === "ready" ? "PAID" : t.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-bold text-text-primary leading-tight">
                        {t.event_title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5" /> {t.ticket_tier_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {t.event_start}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-subtle pt-3 sm:border-0 sm:pt-0 sm:flex-col sm:items-end">
                    <div className="text-right">
                      <span className="block text-[10px] font-mono text-text-secondary">TOTAL AMOUNT</span>
                      <span className="text-base font-extrabold text-primary">
                        {formatIDR(t.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Link
                        href="/orders"
                        className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Ticket
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
