"use client";

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle } from 'lucide-react';
import { Event } from '@/types/admin';

interface EventCreateModalProps {
  onClose: () => void;
  onAddEvent: (newEvent: Event) => void;
}

export default function EventCreateModal({ onClose, onAddEvent }: EventCreateModalProps) {
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('Concert');
  const [newCapacity, setNewCapacity] = useState('5000');
  const [newPrice, setNewPrice] = useState('150');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDate || !newVenue || !newLocation) {
      alert('Please fill out all primary event fields.');
      return;
    }

    const capacityNum = parseInt(newCapacity) || 5000;

    const newEvent: Event = {
      id: `EV-${Date.now().toString().slice(-3)}`,
      name: newName,
      date: newDate,
      venue: newVenue,
      location: newLocation,
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop', // default fallback event image
      capacity: capacityNum,
      ticketsSold: 0,
      totalRevenue: 0,
      category: newCategory,
      description: newDescription || 'A spectacular new event added through the Super Admin operations module.'
    };

    onAddEvent(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-border-subtle bg-surface-white p-6 shadow-overlay">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-2 text-secondary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Create New Event</h3>
            <p className="text-xs text-text-secondary">Add the core details needed for event management.</p>
          </div>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Event Name */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Neon Nights Festival"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              >
                <option value="Concert">Concert</option>
                <option value="Conference">Conference</option>
                <option value="Sports">Sports</option>
                <option value="Classical">Classical</option>
                <option value="Finance">Finance</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* Venue Name */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Venue</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Arena"
                value={newVenue}
                onChange={(e) => setNewVenue(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* City/Location */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">City & Country</label>
              <input
                type="text"
                required
                placeholder="e.g. London, UK"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Total Capacity</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* Price */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Average Ticket Price ($)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Description</label>
              <textarea
                rows={3}
                placeholder="Tell us what this event is about..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-secondary focus:bg-surface-white focus:ring-2 focus:ring-secondary/20"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end gap-2 border-t border-border-subtle pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Create Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
