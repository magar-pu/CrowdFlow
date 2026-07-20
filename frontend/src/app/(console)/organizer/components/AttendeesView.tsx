import React, { useEffect, useState } from "react";
import { Search, Mail, Calendar, UserCheck } from "lucide-react";
import { listAttendees, OrganizerAttendee } from "@/lib/api/eorganizer";

export default function AttendeesView() {
  const [search, setSearch] = useState("");
  const [attendees, setAttendees] = useState<OrganizerAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendees = async () => {
      setIsLoading(true);
      const res = await listAttendees();
      if (res.success && res.data) {
        setAttendees(res.data);
      }
      setIsLoading(false);
    };
    fetchAttendees();
  }, []);

  const filtered = attendees.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.ticketType.toLowerCase().includes(search.toLowerCase())
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
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-3 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-surface-container rounded"></div>
                  <div className="h-2.5 w-16 bg-surface-container rounded"></div>
                </div>
                <div className="h-5 w-16 bg-surface-container rounded-full"></div>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="h-3 w-40 bg-surface-container rounded"></div>
                <div className="h-3 w-32 bg-surface-container rounded"></div>
                <div className="h-3 w-48 bg-surface-container rounded"></div>
              </div>
            </div>
          ))
        ) : filtered.map((attendee) => {
          const isCheckedIn = attendee.status.toLowerCase() === "checked-in" || attendee.status === "Checked-in" || attendee.status.toLowerCase() === "checkedin";
          return (
            <div key={attendee.id} className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col justify-between hover:border-outline transition-colors">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-text-primary leading-tight">{attendee.name}</h4>
                    <span className="text-[10px] text-on-surface-variant font-mono font-medium">{attendee.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                    isCheckedIn
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-secondary/10 text-secondary border border-secondary/20"
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
                    <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span>Ticket Type: <strong className="text-text-primary">{attendee.ticketType}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span>Seat Assignment: <strong>{attendee.seatNumber || "General Seating"}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs text-text-secondary border border-dashed border-border-subtle rounded-xl bg-white soft-shadow w-full">
            No attendee records registered.
          </div>
        )}
      </div>
    </div>
  );
}
