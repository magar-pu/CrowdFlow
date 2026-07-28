/**
 * lib/tierColors.ts
 *
 * The colour a ticket tier is drawn with on a seat map.
 *
 * Shared deliberately: the organizer paints seats in the workspace and the
 * buyer sees the result on the event page, and those two maps have to agree.
 * When each screen kept its own palette they were one edit away from showing
 * the same event in different colours.
 */

/** Ordered so adjacent tiers stay distinguishable, including for red/green CVD. */
export const TIER_PALETTE = [
  "#2563eb",
  "#f59e0b",
  "#16a34a",
  "#db2777",
  "#7c3aed",
  "#0891b2",
] as const;

/**
 * Colour for the tier at `index` in a price-ascending tier list. Wraps, so any
 * number of tiers is safe. A negative index (tier not found) falls back to the
 * first entry rather than throwing.
 */
export function tierColorAt(index: number): string {
  return TIER_PALETTE[(index < 0 ? 0 : index) % TIER_PALETTE.length];
}

/**
 * The tier's own colour when the organizer chose one, otherwise its position in
 * the palette. Position is the fallback rather than the rule because most tiers
 * carry no explicit colour yet.
 *
 * "No colour" includes the empty string, not just null. This used to test with
 * `??`, which passes "" through as if it were a real choice — and the seat map
 * endpoint sends exactly that, since ticket_tiers has no colour column. Every
 * seat then resolved to "", which is falsy at the point of use, so the whole
 * map fell back to the green "available" status colour and every tier looked
 * identical.
 */
export function tierColor(explicit: string | null | undefined, index: number): string {
  const chosen = explicit?.trim();
  return chosen ? chosen : tierColorAt(index);
}
