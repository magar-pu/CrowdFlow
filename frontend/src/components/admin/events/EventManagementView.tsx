"use client";

import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Search, Filter, ChevronRight } from 'lucide-react';
import { Event } from '@/types/admin';
import EventCreateModal from './EventCreateModal';

interface EventManagementViewProps {
  events: Event[];
  onAddEvent: (newEvent: Event) => void;
  onSelectEvent: (id: string) => void;
}

export default function EventManagementView({ events, onAddEvent, onSelectEvent }: EventManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtering logic
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categoriesList = ['All', 'Concert', 'Conference', 'Sports', 'Classical', 'Finance'];

  return (
    <div className="space-y-6">
      {/* Event Header with KPI Summary Cards */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Event Management</h1>
          <p className="mt-1 text-sm text-slate-400">Launch new venues, audit active registrations, and monitor scanning check-in desks.</p>
        </div>
        <button
          id="btn-create-event-modal"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3.5 h-4.5 w-4.5 text-slate-500" />
          <input
            id="event-search-input"
            type="text"
            placeholder="Search events by title, venue, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2 pr-4 pl-10.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:bg-slate-900"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Selector */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              id="event-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 outline-none transition-colors focus:border-indigo-500 focus:bg-slate-900"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat} Category</option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <select
            id="event-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 outline-none transition-colors focus:border-indigo-500 focus:bg-slate-900"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Reset Filters */}
          {(searchTerm || categoryFilter !== 'All' || statusFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('All');
                setStatusFilter('All');
              }}
              className="text-xs font-semibold text-rose-400 hover:text-rose-355 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Grid Layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No events found matching your query.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting filters or registering a new event above.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const soldPercentage = Math.round((event.ticketsSold / event.capacity) * 100) || 0;
            return (
              <div 
                key={event.id} 
                id={`event-card-${event.id}`}
                className="group relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm hover:border-slate-700/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Event Cover Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img 
                    src={event.image} 
                    alt={event.name} 
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase border tracking-widest ${
                      event.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/10' 
                        : event.status === 'Draft' 
                        ? 'bg-slate-800 text-slate-400 border-slate-700' 
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {event.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {event.status}
                    </span>
                  </div>

                  {/* Category Tag Overlay */}
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[9px] font-semibold text-white uppercase tracking-wider backdrop-blur-md">
                      {event.category}
                    </span>
                  </div>
                </div>

                {/* Event Details Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                      {event.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-600" />
                      <span>{event.venue}, {event.location}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-600" />
                      <span>{event.date}</span>
                    </p>
                  </div>

                  {/* Dynamic Progress Indicator */}
                  <div className="mt-5 space-y-2 border-t border-slate-900 pt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Registrations Velocity</span>
                      <span className="font-mono text-slate-300 font-bold">{soldPercentage}% sold</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          soldPercentage > 90 ? 'bg-pink-500' : 'bg-indigo-500'
                        }`} 
                        style={{ width: `${soldPercentage}%` }} 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                      <span>{event.ticketsSold.toLocaleString()} / {event.capacity.toLocaleString()} seats</span>
                      <span className="font-semibold font-mono text-slate-300">${event.totalRevenue.toLocaleString()} Net</span>
                    </div>
                  </div>
                </div>

                {/* Event Action Panel */}
                <div className="bg-slate-900/30 border-t border-slate-900 p-3 flex gap-2">
                  <button
                    onClick={() => onSelectEvent(event.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-indigo-600/10 border border-indigo-500/20 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-transparent transition-all cursor-pointer"
                  >
                    <span>Open Workspace</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create New Event Modal Dialog Overlay */}
      {showCreateModal && (
        <EventCreateModal 
          onClose={() => setShowCreateModal(false)} 
          onAddEvent={onAddEvent} 
        />
      )}
    </div>
  );
}
