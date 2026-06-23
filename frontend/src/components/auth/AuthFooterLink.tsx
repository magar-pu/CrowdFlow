/**
 * components/auth/AuthFooterLink.tsx
 *
 * The light-gray footer strip at the bottom of the auth card (e.g.
 * "Don't have an account? Create an account"). Shared across Sign In /
 * Sign Up so the prompt text and link target are the only things that
 * change per page. Matches Stitch markup exactly.
 */

import Link from "next/link";

interface AuthFooterLinkProps {
  prompt: string;
  link_label: string;
  href: string;
}

export function AuthFooterLink({
  prompt,
  link_label,
  href,
}: AuthFooterLinkProps) {
  return (
    <div className="border-t border-border-subtle bg-surface-container-low p-6 text-center">
      <p className="font-body-sm text-body-sm text-text-secondary">
        {prompt}{" "}
        <Link
          href={href}
          className="font-semibold text-secondary underline-offset-4 decoration-2 hover:underline"
        >
          {link_label}
        </Link>
      </p>
    </div>
  );
}