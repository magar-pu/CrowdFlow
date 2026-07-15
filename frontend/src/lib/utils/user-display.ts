/**
 * lib/utils/user-display.ts
 * Shared helpers for rendering user identity (avatar initials, role labels)
 * consistently across the public Navbar and the admin console.
 */

export function get_initials(full_name: string): string {
  return full_name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function format_role_label(role: string): string {
  return role
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
