"use client";

import React from "react";
import { useRouter } from "next/navigation";
import EventWorkspaceHeader from "./EventWorkspaceHeader";
import { useEorganizerData } from "../EorganizerDataContext";

interface EventWorkspaceShellProps {
  eventId: string;
  activeTab: string;
  children: React.ReactNode;
}

export default function EventWorkspaceShell({ eventId, activeTab, children }: EventWorkspaceShellProps) {
  const router = useRouter();
  const { events } = useEorganizerData();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Event not found</p>
        <p className="text-xs text-text-secondary mt-1">"{eventId}" does not match any event.</p>
        <button
          onClick={() => router.push('/eorganizer/events')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <>
      <EventWorkspaceHeader
        event={event}
        workspaceTab={activeTab}
        setWorkspaceTab={(tab) => router.push(tab === 'overview' ? `/eorganizer/events/${eventId}` : `/eorganizer/events/${eventId}/${tab}`)}
        onBack={() => router.push('/eorganizer/events')}
      />
      {children}
    </>
  );
}
