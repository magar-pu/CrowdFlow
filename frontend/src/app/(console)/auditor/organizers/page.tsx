"use client";

import { useRouter } from "next/navigation";
import OrganizersView from "../components/OrganizersView";
import { useAuditorData } from "../AuditorDataContext";

export default function AuditorOrganizersPage() {
  const router = useRouter();
  const { organizers } = useAuditorData();

  return (
    <OrganizersView
      organizers={organizers}
      onSelectOrganizer={(org) => router.push(`/auditor/organizers/${org.id}`)}
    />
  );
}
