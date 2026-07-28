/**
 * Shared event date formatting.
 *
 * Event cards across the homepage and discovery pages all render the same
 * "30 Sep • 19:00 WIB" shape from an ISO-8601 `starts_at`. Kept here so the
 * locale and the WIB suffix are defined once.
 */

/** e.g. "30 Sep 2026" — compact date form used on event cards. */
export function formatEventDateLabel(starts_at: string): string {
  const date = new Date(starts_at);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "30 September 2026" — long date form used on listing rows. */
export function formatEventDateLabelLong(starts_at: string): string {
  const date = new Date(starts_at);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
