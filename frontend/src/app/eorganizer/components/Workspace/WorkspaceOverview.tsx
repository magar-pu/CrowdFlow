import React, { useState } from "react";
import { DollarSign, Ticket, Gauge, Eye, RotateCcw, ArrowUpRight } from "lucide-react";
import { EventItem, TicketTier, ScannerDevice, LogEntry, Transaction } from "../../types";

interface WorkspaceOverviewProps {
  event: EventItem;
  ticketTiers: TicketTier[];
  devices: ScannerDevice[];
  transactions: Transaction[];
  logs: LogEntry[];
  onSwitchTab: (tab: string) => void;
}

type Range = '1w' | '1m' | 'all';

const RANGE_DATA: Record<Range, { label: string; sales: number; revenue: number }[]> = {
  '1w': [
    { label: 'Mon', sales: 120, revenue: 3400 },
    { label: 'Tue', sales: 180, revenue: 5200 },
    { label: 'Wed', sales: 240, revenue: 7100 },
    { label: 'Thu', sales: 300, revenue: 8900 },
    { label: 'Fri', sales: 420, revenue: 12400 },
    { label: 'Sat', sales: 510, revenue: 15600 },
    { label: 'Sun', sales: 380, revenue: 11200 },
  ],
  '1m': [
    { label: 'W1', sales: 620, revenue: 18400 },
    { label: 'W2', sales: 980, revenue: 29200 },
    { label: 'W3', sales: 1240, revenue: 36800 },
    { label: 'W4', sales: 1580, revenue: 46900 },
  ],
  all: [
    { label: 'Jan', sales: 340, revenue: 9800 },
    { label: 'Feb', sales: 610, revenue: 17900 },
    { label: 'Mar', sales: 890, revenue: 26200 },
    { label: 'Apr', sales: 1150, revenue: 34100 },
    { label: 'May', sales: 1490, revenue: 44300 },
    { label: 'Jun', sales: 1842, revenue: 54800 },
  ],
};

const RANGE_LABELS: Record<Range, string> = { '1w': '1 Week', '1m': '1 Month', all: 'All Time' };

export default function WorkspaceOverview({
  ticketTiers,
  transactions,
  logs
}: WorkspaceOverviewProps) {
  const [range, setRange] = useState<Range>('1w');

  const totalRevenue = ticketTiers.reduce((acc, curr) => acc + (curr.sold * curr.price), 0);
  const totalTicketsSold = ticketTiers.reduce((acc, curr) => acc + curr.sold, 0);
  const totalTicketsCapacity = ticketTiers.reduce((acc, curr) => acc + curr.capacity, 0);
  const capacityRatio = totalTicketsCapacity > 0 ? (totalTicketsSold / totalTicketsCapacity) * 100 : 0;
  const pageViews = totalTicketsSold * 18 + 4200;
  const refundsAmount = Math.round(totalRevenue * 0.021);
  const refundsCount = transactions.filter(t => t.status === 'failed').length;

  const chartData = RANGE_DATA[range];
  const svgWidth = 580;
  const svgHeight = 220;
  const padding = 30;
  const maxSales = Math.max(...chartData.map(d => d.sales));
  const maxRevenue = Math.max(...chartData.map(d => d.revenue));
  const getX = (idx: number) => padding + (idx * (svgWidth - 2 * padding)) / (chartData.length - 1);
  const getY = (val: number, max: number) => svgHeight - padding - (val / max) * (svgHeight - 2 * padding);

  const getPathD = (key: "sales" | "revenue") =>
    chartData.reduce((acc, d, i) => `${acc} ${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[key], key === "sales" ? maxSales : maxRevenue)}`, "");

  const getAreaD = (key: "sales" | "revenue") =>
    `${getPathD(key)} L ${getX(chartData.length - 1)} ${svgHeight - padding} L ${getX(0)} ${svgHeight - padding} Z`;

  const statusStyle = (status: Transaction['status']) =>
    status === 'completed' ? 'bg-success/10 text-success border-success/20' :
    status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
    'bg-danger/10 text-danger border-danger/20';

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Gross Revenue</span>
            <div className="p-1.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg"><DollarSign className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">${totalRevenue.toLocaleString()}</h3>
          <p className="text-[10px] text-text-secondary font-mono mt-1 flex items-center gap-1">
            <span className="text-success font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> +14.2%</span> since yesterday
          </p>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Tickets Sold</span>
            <div className="p-1.5 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-lg"><Ticket className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{totalTicketsSold.toLocaleString()}</h3>
          <p className="text-[10px] text-text-secondary font-mono mt-1">of {totalTicketsCapacity.toLocaleString()} allocated</p>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Capacity</span>
            <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg"><Gauge className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{capacityRatio.toFixed(1)}%</h3>
          <div className="w-full bg-surface-container h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, capacityRatio)}%` }}></div>
          </div>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Page Views</span>
            <div className="p-1.5 bg-success/10 border border-success/20 text-success rounded-lg"><Eye className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">{pageViews.toLocaleString()}</h3>
          <p className="text-[10px] text-text-secondary font-mono mt-1">Event page traffic</p>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-text-secondary">Refunds</span>
            <div className="p-1.5 bg-danger/10 border border-danger/20 text-danger rounded-lg"><RotateCcw className="w-4 h-4" /></div>
          </div>
          <h3 className="text-xl font-bold text-text-primary">${refundsAmount.toLocaleString()}</h3>
          <p className="text-[10px] text-text-secondary font-mono mt-1">{refundsCount} tickets refunded</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-white border border-border-subtle rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary">Ticket Sales & Revenue</h4>
              <p className="text-[10px] text-text-secondary">Trend over {RANGE_LABELS[range].toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 text-tertiary">● Sales</span>
                <span className="flex items-center gap-1.5 text-secondary">● Revenue</span>
              </div>
              <div className="inline-flex rounded-lg border border-border-subtle p-0.5 bg-surface-container-low">
                {(Object.keys(RANGE_DATA) as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      range === r ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative w-full h-[180px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                <line key={i} x1={padding} y1={padding + r * (svgHeight - 2 * padding)} x2={svgWidth - padding} y2={padding + r * (svgHeight - 2 * padding)} stroke="#F1F5F9" strokeWidth="1" />
              ))}
              {chartData.map((d, i) => (
                <text key={i} x={getX(i)} y={svgHeight - padding + 15} fill="#94A3B8" fontSize="8" fontFamily="monospace" textAnchor="middle">{d.label}</text>
              ))}
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity="0.1" /><stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity="0" /></linearGradient>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.1" /><stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" /></linearGradient>
              </defs>
              <path d={getAreaD("sales")} fill="url(#sGrad)" />
              <path d={getAreaD("revenue")} fill="url(#cGrad)" />
              <path d={getPathD("sales")} fill="none" stroke="var(--color-tertiary)" strokeWidth="2" strokeLinecap="round" />
              <path d={getPathD("revenue")} fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-text-primary">Recent Activity</h4>
            <p className="text-[10px] text-text-secondary">Live feed of gate and sales events</p>
          </div>
          <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1 flex-1">
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="text-[10px] border-b border-border-subtle pb-2 text-left">
                <div className="flex justify-between font-mono text-on-surface-variant">
                  <span>{log.gate} • {log.timestamp}</span>
                </div>
                <p className="text-text-primary font-medium leading-relaxed mt-0.5">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
        <div className="p-4 border-b border-border-subtle">
          <h4 className="text-sm font-bold text-text-primary">Recent Transactions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Order ID</th>
                <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Customer</th>
                <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Ticket</th>
                <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Amount</th>
                <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {transactions.slice(0, 6).map((tx) => (
                <tr key={tx.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-container-low transition-colors">
                  <td className="p-3 font-mono font-bold text-text-primary">{tx.id}</td>
                  <td className="p-3 text-text-secondary">{tx.attendee}</td>
                  <td className="p-3 font-medium text-text-primary">{tx.ticketType}</td>
                  <td className="p-3 text-right font-mono font-semibold">${tx.amount.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold border ${statusStyle(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-xs text-on-surface-variant font-mono">No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
