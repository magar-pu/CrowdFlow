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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-300 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Create New Event Node</h3>
            <p className="text-2xs text-slate-400">Launch a new event contract to initiate scanner syncing and seat layout allocation.</p>
          </div>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Event Name */}
            <div className="sm:col-span-2">
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Neon Nights Festival"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
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
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Venue Name */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Venue Location</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Arena"
                value={newVenue}
                onChange={(e) => setNewVenue(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* City/Location */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City & Country</label>
              <input
                type="text"
                required
                placeholder="e.g. London, UK"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Seats Capacity</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Average Ticket Price ($)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Detailed Description</label>
              <textarea
                rows={3}
                placeholder="Tell us what this event is about..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-900 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Launch Event Node</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
