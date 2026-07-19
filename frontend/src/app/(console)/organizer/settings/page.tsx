"use client";

import SettingsView from "../components/SettingsView";
import { useOrganizerData } from "../OrganizerDataContext";

export default function OrganizerSettingsPage() {
  const { adminName, setAdminName, adminRole, setAdminRole } = useOrganizerData();

  return (
    <SettingsView
      adminName={adminName}
      setAdminName={setAdminName}
      adminRole={adminRole}
      setAdminRole={setAdminRole}
    />
  );
}
