"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="user">
      {children}
    </AuthGuard>
  );
}
