"use client";

import SettingsView from "../components/SettingsView";
import { useEorganizerData } from "../EorganizerDataContext";

export default function EorganizerSettingsPage() {
  const { adminName, setAdminName, adminRole, setAdminRole } = useEorganizerData();

  return (
    <SettingsView
      adminName={adminName}
      setAdminName={setAdminName}
      adminRole={adminRole}
      setAdminRole={setAdminRole}
    />
  );
}
