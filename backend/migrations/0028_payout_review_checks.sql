-- Migration 0028: persist the payout review checklist, and scope activity_log
-- rows to the payout they describe.
--
-- Two separate defects, one migration, because the second is what makes the
-- first auditable.
--
-- 1. THE CHECKLIST WAS NEVER STORED.
--    /auditor/payouts/[id] shows an eleven-item verification checklist — six
--    financial, five compliance. Every one of them lived in a React useState
--    initialised to false, so ticking a box survived exactly as long as the
--    component stayed mounted: navigate away and the auditor's work was gone
--    with no record it ever happened. Worse, a complianceScore derived from
--    those booleans is rendered on the APPROVE confirmation modal, so the
--    screen that releases money graded the auditor against a checklist the
--    platform did not keep.
--
-- 2. THE PAYOUT TIMELINE MATCHED ON A SUBSTRING.
--    activity_log has only actor_id / action / detail / created_at, so the
--    payout timeline query is `WHERE detail ILIKE '%payout 3%'`. That is a
--    prefix match on a decimal number: payout 3 also shows every event logged
--    against payouts 30-39, 300-399, and so on. On this screen a foreign
--    approval shown under the current payout is not cosmetic.

BEGIN;

-- payout_review_checks -------------------------------------------------------
-- Keyed per PAYOUT, not per auditor. The checklist is a statement about the
-- payout — "these things were verified before the money left" — not a private
-- worksheet each reviewer keeps their own copy of. Two auditors looking at the
-- same payout must see the same ticks.
--
-- Unticking writes checked = FALSE rather than deleting the row, so the act of
-- withdrawing a tick keeps an actor and a timestamp too. A deleted row would
-- make an unticked box indistinguishable from one nobody ever touched.

CREATE TABLE IF NOT EXISTS payout_review_checks (
    id           SERIAL PRIMARY KEY,
    payout_id    INTEGER NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    item_key     VARCHAR(64) NOT NULL,
    checked      BOOLEAN NOT NULL DEFAULT FALSE,
    checked_by   INTEGER REFERENCES users(id),
    checked_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (payout_id, item_key)
);

-- The UNIQUE constraint's index is (payout_id, item_key), so lookups by
-- payout_id alone already use it as a leading-column prefix. No second index.

COMMENT ON TABLE payout_review_checks IS
    'Per-payout auditor verification checklist. One row per (payout, item). Written by PATCH /auditor/payouts/{id}/checks one item at a time so concurrent reviewers cannot clobber each other. Frozen in the application layer once the payout reaches a terminal status.';

COMMENT ON COLUMN payout_review_checks.checked_by IS
    'The auditor who last changed this item, ticked OR unticked. NULL only if that user row is later removed.';

-- The eleven keys are fixed and mirror the two checklist objects in the
-- auditor console's types.ts. Go holds the authoritative whitelist and rejects
-- anything outside it before this table is ever reached — this CHECK is the
-- second line, and deliberately makes adding a twelfth item a migration rather
-- than a one-line frontend change. An audit checklist that can grow silently is
-- not a record of a fixed standard.
ALTER TABLE payout_review_checks
    ADD CONSTRAINT chk_payout_review_item_key CHECK (item_key IN (
        -- financial
        'revenueMatch',
        'ticketSalesMatch',
        'refundCalculated',
        'platformFeeCorrect',
        'taxCorrect',
        'netRevenueCorrect',
        -- compliance
        'eventApproved',
        'organizerVerified',
        'requiredDocumentsComplete',
        'noActiveInvestigation',
        'noPendingRevision'
    ));

-- activity_log resource scoping ----------------------------------------------
-- Both columns are NULLABLE and stay NULL for every existing row. Historic
-- details cannot be backfilled safely: the very substring ambiguity being fixed
-- here means a parser reading "payout 3" out of an old detail string would
-- reattribute exactly the rows it is meant to disambiguate. So the timeline
-- query becomes
--     (resource_type = 'payout' AND resource_id = $1)
--     OR (resource_type IS NULL AND detail ILIKE $2)
-- — new writes are exact, old rows keep the imperfect match they already had,
-- and no row is silently reassigned.
--
-- Scope is PAYOUTS ONLY. The organizer history query has the same hack matching
-- on company NAME; it is untouched here on purpose, because half-populating
-- these columns across features would leave the OR-fallback above unable to
-- tell "no resource columns yet" from "a different feature's resource".

ALTER TABLE activity_log
    ADD COLUMN IF NOT EXISTS resource_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS resource_id   INTEGER;

COMMENT ON COLUMN activity_log.resource_type IS
    'What this entry is about, e.g. ''payout''. NULL on rows written before migration 0028 and on features not yet converted — readers must fall back to the legacy detail match for those.';

CREATE INDEX IF NOT EXISTS idx_activity_log_resource
    ON activity_log (resource_type, resource_id)
    WHERE resource_type IS NOT NULL;

COMMIT;
