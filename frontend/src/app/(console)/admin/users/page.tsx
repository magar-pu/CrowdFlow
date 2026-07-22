"use client";

import { useEffect } from "react";
import UserManagementView from "@/components/admin/users/UserManagementView";
import { useAdminData } from "../AdminDataContext";

export default function AdminUsersPage() {
  const {
    users,
    verifications,
    events,
    usersLoading,
    usersError,
    usersPage,
    setUsersPage,
    usersHasNext,
    handleApproveVerification,
    handleRejectVerification,
    handleToggleUserStatus,
    handleGrantRole,
    handleRevokeRole,
  } = useAdminData();

  // Reset to the first page whenever the list is (re)opened, so a deep page
  // from a prior visit doesn't linger (matches the pre-routing behavior).
  useEffect(() => {
    setUsersPage(0);
  }, [setUsersPage]);

  return (
    <div className="space-y-4">
      {usersError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {usersError}
        </div>
      )}
      {usersLoading ? (
        <div className="py-24 text-center text-sm text-text-secondary">Loading users...</div>
      ) : (
        <UserManagementView
          users={users}
          verifications={verifications}
          events={events}
          onApproveVerification={handleApproveVerification}
          onRejectVerification={handleRejectVerification}
          onToggleUserStatus={handleToggleUserStatus}
          onGrantRole={handleGrantRole}
          onRevokeRole={handleRevokeRole}
          page={usersPage}
          hasNextPage={usersHasNext}
          onPrevPage={() => setUsersPage((p) => Math.max(0, p - 1))}
          onNextPage={() => setUsersPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
