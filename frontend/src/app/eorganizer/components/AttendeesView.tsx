import React, { useState } from 'react';
import { Search, Mail, Phone, Calendar } from 'lucide-react';

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  event: string;
  status: 'Checked-in' | 'Registered';
  ticket: string;
}

export default function AttendeesView() {
  const [search, setSearch] = useState('');
  const [attendees] = useState<Attendee[]>([
    { id: 'ATT-001', name: 'Alice Cooper', email: 'alice@cooper.org', phone: '+1 (555) 019-2831', event: 'Global Tech Summit 2024', status: 'Checked-in', ticket: 'VIP All-Access' },
    { id: 'ATT-002', name: 'Bob Dylan', email: 'bob@dylan.com', phone: '+1 (555) 012-4822', event: 'Aurora Music Festival', status: 'Checked-in', ticket: 'General Admission' },
    { id: 'ATT-003', name: 'Charlotte Bennett', email: 'char@bennett.net', phone: '+1 (555) 017-9901', event: 'Global Tech Summit 2024', status: 'Registered', ticket: 'VIP All-Access' },
    { id: 'ATT-004', name: 'Liam Vance', email: 'liam@vance.org', phone: '+1 (555) 014-8822', event: 'Aurora Music Festival', status: 'Registered', ticket: 'General Admission' }
  ]);

  const filtered = attendees.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.event.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Attendees List</h1>
        <p className="text-sm text-text-secondary">Track registrations, contact details, and entrance scanning records.</p>
      </div>

      <div className="flex bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full sm:w-80 bg-surface-container-low">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((attendee) => (
          <div key={attendee.id} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col justify-between hover:border-outline transition-colors">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <h4 className="text-sm font-bold text-text-primary leading-tight">{attendee.name}</h4>
                  <span className="text-[10px] text-on-surface-variant font-mono font-medium">{attendee.id}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                  attendee.status === 'Checked-in'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-secondary/10 text-secondary border border-secondary/20'
                }`}>
                  {attendee.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{attendee.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{attendee.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>{attendee.event} • <strong className="text-text-primary">{attendee.ticket}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
