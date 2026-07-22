import React from 'react';
import { PlatformRole } from '@/types/admin';

// Single source of truth for how each platform role renders as a badge, so the
// directory table, the detail drawer, and any future role UI stay consistent.
// Every colored variant mirrors the token pattern already used for the status
// badges (border/xx-20 + bg/xx-10 + text-xx) so contrast matches the rest of
// the admin console. "Buyer" is intentionally muted - it's the baseline role.
const ROLE_BADGE_STYLES: Record<PlatformRole, string> = {
  Admin: 'border border-danger/20 bg-danger/10 text-danger',
  Organizer: 'border border-secondary/20 bg-secondary/10 text-secondary',
  Auditor: 'border border-warning/30 bg-warning/10 text-warning',
  'Gate Scanner': 'border border-tertiary/20 bg-tertiary/10 text-tertiary',
  Mixed: 'border border-primary/20 bg-primary/10 text-primary',
  Seller: 'border border-tertiary/20 bg-tertiary/10 text-tertiary',
  Buyer: 'border border-border-subtle bg-surface text-text-secondary',
};

const DEFAULT_STYLE = 'border border-border-subtle bg-surface text-text-secondary';

export function roleBadgeClass(role: PlatformRole): string {
  return ROLE_BADGE_STYLES[role] ?? DEFAULT_STYLE;
}

interface RoleBadgeProps {
  role: PlatformRole;
  /** Optional label override (e.g. show the underlying roles behind "Mixed"). */
  label?: string;
  className?: string;
}

export default function RoleBadge({ role, label, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${roleBadgeClass(
        role
      )} ${className}`}
    >
      {label ?? role}
    </span>
  );
}
