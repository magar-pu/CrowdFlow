"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  Ticket,
  Search,
  Eye,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getMyTickets, UserTicket } from "@/lib/api/tickets";
import { formatIDR } from "@/lib/pricing";

/**
 * Only the statuses the backend actually writes.
 *
 * The ticket_status enum also carries reserved / resold / cancelled / refunded /
 * expired / ready, but nothing in the codebase ever writes them — a grep of
 * every ticket_status assignment turns up only 'issued' and 'used'. The
 * "refunded" and "cancelled" tabs could therefore never match a row, and
 * "expired" was wired to 'used', which means checked in, not expired.
 *
 * Add tabs back when something writes the status they filter on.
 */
type FilterTab = "all" | "paid" | "attended";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "attended", label: "Attended" },
];

export default function PurchaseHistoryPage() {
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // A failed request used to be swallowed outright, leaving the page showing
  // "No Purchase Records Found" — indistinguishable from having bought nothing.
  const loadHistory = useCallback(async () => {
    try {
      const res = await getMyTickets();
      setError(null);
      if (!res.success) {
        setError(res.error?.message || "We couldn't load your purchase history.");
        setTickets([]);
        return;
      }
      setTickets(res.data?.tickets ?? []);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wrapped so react-hooks/set-state-in-effect can see no synchronous
    // setState in the effect body.
    async function run() {
      await loadHistory();
    }
    run();
  }, [loadHistory]);

  const filteredTickets = tickets.filter((t) => {
    const title = t.eventName || "";
    const order = t.orderId || "";
    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "paid") return matchesSearch && t.ticketStatus === "issued";
    if (activeTab === "attended") return matchesSearch && t.ticketStatus === "used";
    return matchesSearch;
  });

  return (
    <div className="flex min-h-screen flex-col bg-surface-dim">
      <Navbar active_href="/profile" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} /> Back to Profile
          </Link>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Purchase History &amp; Invoices
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                View all your past ticket purchases, payment receipts, and download official TAX invoices.
              </p>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Ticket size={16} />
              View Active Tickets
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border-subtle bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-black text-white shadow-xs"
                    : "bg-surface text-text-secondary hover:bg-surface-container-high"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event title or Order #..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-border-subtle rounded-xl bg-surface focus:bg-white focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Purchase History Table */}
        {loading ? (
          <div className="flex py-16 items-center justify-center text-xs text-text-secondary">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
            Loading purchase history...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-12 text-center shadow-xs">
            <AlertCircle className="mx-auto h-12 w-12 text-danger/50" />
            <h3 className="mt-4 text-base font-bold text-text-primary">
              Couldn&apos;t load your purchase history
            </h3>
            <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadHistory();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-12 text-center shadow-xs">
            <Clock className="mx-auto h-12 w-12 text-text-secondary/40" />
            <h3 className="mt-4 text-base font-bold text-text-primary">No Purchase Records Found</h3>
            <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">
              You haven&apos;t completed any ticket purchases yet matching this filter.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90 transition-colors"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="overflow-hidden rounded-2xl border border-border-subtle bg-white p-5 shadow-xs transition-all hover:border-primary/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4 items-start sm:items-center">
                    {t.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.coverImageUrl}
                        alt={t.eventName}
                        className="h-16 w-16 rounded-xl object-cover border border-border-subtle shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl border border-border-subtle bg-gradient-to-br from-secondary/30 to-primary/20 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary uppercase">
                          {t.orderId}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.ticketStatus === "issued" || t.ticketStatus === "ready"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {t.ticketStatus === "issued"
                            ? "PAID"
                            : t.ticketStatus === "used"
                              ? "ATTENDED"
                              : t.ticketStatus.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-bold text-text-primary leading-tight">
                        {t.eventName}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5 text-primary" /> {t.tierName || "Standard"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-subtle pt-3 sm:border-0 sm:pt-0 sm:flex-col sm:items-end">
                    <div className="text-right">
                      {/* Per-ticket price, not an order total: this list is one
                          row per ticket, so a multi-ticket order appears more
                          than once and summing is not implied. */}
                      <span className="block text-[10px] font-mono text-text-secondary">TICKET PRICE</span>
                      <span className="text-base font-extrabold text-primary">
                        {formatIDR(t.unitPrice || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Link
                        href="/orders"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ticket
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
