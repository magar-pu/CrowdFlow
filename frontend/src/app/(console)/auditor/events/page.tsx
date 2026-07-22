"use client";

import { useRouter } from "next/navigation";
import EventsTableView from "../components/EventsTableView";

export default function AuditorEventsPage() {
  const router = useRouter();

  return (
    <EventsTableView />
  );
}
