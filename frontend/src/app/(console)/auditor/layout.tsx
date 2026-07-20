import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';
import AuditorShell from './components/AuditorShell';

export const metadata: Metadata = {
  title: 'CrowdFlow Auditor Console',
  description: 'Compliance review workspace for event submissions and organizer documents.',
};

export default function AuditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='w-full min-h-screen bg-surface text-text-primary'>
      <AuthGuard requiredRole="auditor">
        <AuditorShell>{children}</AuditorShell>
      </AuthGuard>
    </div>
  );
}
