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
          <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">Event Management</h1>
          <p className="mt-2 text-sm text-text-secondary">Create events, review capacity, and open each event workspace.</p>
        </div>
        <button
          id="btn-create-event-modal"
          onClick={() => setShowCreateModal(true)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-white p-4 shadow-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3.5 h-4.5 w-4.5 text-text-secondary" />
          <input
            id="event-search-input"
            type="text"
            placeholder="Search events by title, venue, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-subtle bg-surface py-2 pr-4 pl-10.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Selector */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-secondary" />
            <select
              id="event-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
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
            className="h-11 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
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
              className="text-xs font-semibold text-danger transition-colors hover:text-danger/80 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Grid Layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border-subtle bg-surface-white py-16 text-center text-text-secondary">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">No events found matching your query.</p>
            <p className="mt-1 text-xs text-text-secondary">Try resetting filters or create a new event.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const soldPercentage = Math.round((event.ticketsSold / event.capacity) * 100) || 0;
            return (
              <div 
                key={event.id} 
                id={`event-card-${event.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border-subtle bg-surface-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
              >
                {/* Event Cover Image */}
                <div className="relative h-44 w-full overflow-hidden bg-surface">
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
                        ? 'bg-success/10 text-success border-success/20' 
                        : event.status === 'Draft' 
                        ? 'bg-surface text-text-secondary border-border-subtle' 
                        : 'bg-secondary/10 text-secondary border-secondary/20'
                    }`}>
                      {event.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                      {event.status}
                    </span>
                  </div>

                  {/* Category Tag Overlay */}
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-full bg-primary/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-on-primary backdrop-blur-md">
                      {event.category}
                    </span>
                  </div>
                </div>

                {/* Event Details Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-secondary">
                      {event.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-text-secondary">
                      <MapPin className="h-3 w-3 text-text-secondary" />
                      <span>{event.venue}, {event.location}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-text-secondary">
                      <Calendar className="h-3 w-3 text-text-secondary" />
                      <span>{event.date}</span>
                    </p>
                  </div>

                  {/* Dynamic Progress Indicator */}
                  <div className="mt-5 space-y-2 border-t border-border-subtle pt-4">
                    <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
                      <span>Ticket Sales</span>
                      <span className="font-bold text-text-primary">{soldPercentage}% sold</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          soldPercentage > 90 ? 'bg-warning' : 'bg-secondary'
                        }`} 
                        style={{ width: `${soldPercentage}%` }} 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-text-secondary">
                      <span>{event.ticketsSold.toLocaleString()} / {event.capacity.toLocaleString()} seats</span>
                      <span className="font-semibold text-text-primary">${event.totalRevenue.toLocaleString()} Net</span>
                    </div>
                  </div>
                </div>

                {/* Event Action Panel */}
                <div className="flex gap-2 border-t border-border-subtle bg-surface p-3">
                  <button
                    onClick={() => onSelectEvent(event.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-secondary/20 bg-secondary/5 py-2 text-xs font-semibold text-secondary transition-all hover:bg-secondary hover:text-on-secondary cursor-pointer"
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
