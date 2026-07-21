"use client";

import { useRouter } from "next/navigation";
import CreateEventView from "@/components/admin/events/CreateEventView";
import { useAdminData } from "../../AdminDataContext";

export default function AdminCreateEventPage() {
  const router = useRouter();
  const { refreshEvents } = useAdminData();

  return (
    <CreateEventView
      onBack={() => router.push('/admin/events')}
      onCreated={async () => {
        await refreshEvents();
        router.push('/admin/events');
      }}
    />
  );
}
