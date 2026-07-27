import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { listOrders, OrganizerOrder } from '@/lib/api/eorganizer';
import Select from '@/components/ui/Select';

export default function OrdersView() {
  const [orders, setOrders] = useState<OrganizerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      const res = await listOrders();
      if (res.success && res.data) {
        setOrders(res.data);
      }
      setIsLoading(false);
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.eventName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || o.status.toUpperCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Orders Center</h1>
        <p className="text-sm text-text-secondary">Track and review all ticket admissions transactions on the platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full sm:w-80 bg-surface-container-low">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Status: All</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Order ID</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Client</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Event</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Ticket Tier</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Amount</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-xs animate-pulse">
                    Loading transactions registry...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isPaid = order.status.toLowerCase() === "paid";
                  return (
                    <tr key={order.id} className="border-b border-border-subtle hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-mono text-text-secondary">{order.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-text-primary">{order.customerName}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono">{order.customerEmail}</div>
                      </td>
                      <td className="p-4 font-medium text-text-primary">{order.eventName}</td>
                      <td className="p-4 text-text-secondary">{order.ticketType}</td>
                      <td className="p-4 text-right font-semibold font-mono">${order.amount.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-mono text-[9px] font-bold ${
                          isPaid ? 'status-paid' : 'status-pending'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-xs">
                    No transaction records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
