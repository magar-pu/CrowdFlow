import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'CrowdFlow Organizer Portal',
  description: 'Organizer workspace for managing events, ticketing, and check-in operations.',
};

export default function EorganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='w-full min-h-screen bg-surface text-text-primary'>
      <AuthGuard requiredRole="verified_organizer">{children}</AuthGuard>
    </div>
  );
}
