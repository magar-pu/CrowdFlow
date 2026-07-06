import type { Metadata } from 'next';
import './admin.css';

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
      {children}
    </div>
  );
}
