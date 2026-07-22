import type { Metadata } from 'next';
import './admin.css';
import { AuthGuard } from '@/components/auth/AuthGuard';
import AdminShell from '@/components/admin/layout/AdminShell';

export const metadata: Metadata = {
  title: 'CrowdFlow Admin Operations Panel',
  description: 'Enterprise administration portal for event ticketing, verifications, and compliance desk.',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='w-full min-h-screen bg-slate-50 text-slate-900'>
      <AuthGuard requiredRole="super_admin">
        <AdminShell>{children}</AdminShell>
      </AuthGuard>
    </div>
  );
}
