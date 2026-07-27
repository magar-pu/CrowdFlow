-- Migration 0022: track verification state of an organizer's payout bank account
--
-- Bank details live on organizer_applications (UNIQUE user_id), which is also
-- where the auditor payout screen reads them from. They were collected once by
-- the application wizard and then unreachable: UpdateApplication refuses to
-- touch an application whose status is 'approved', so a VERIFIED organizer —
-- the only kind that can request a payout — had no way to supply or correct
-- them. Payout detail therefore rendered an empty bank block.
--
-- Editing is now allowed after approval through a dedicated payout-details
-- endpoint, which makes the account a redirect target: whoever controls the
-- organizer login controls where the money lands. These columns are what lets
-- an auditor see that the destination moved.
--
--   bank_verification_status
--     unverified — nothing on file, or details changed and not yet re-checked
--     verified   — an auditor has confirmed the account
--   bank_details_updated_at
--     when the organizer last changed any bank field, for the auditor's diff
--
-- No column stores who changed it: activity_log already records the actor.

BEGIN;

ALTER TABLE organizer_applications
    ADD COLUMN IF NOT EXISTS bank_verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS bank_details_updated_at TIMESTAMPTZ;

ALTER TABLE organizer_applications
    DROP CONSTRAINT IF EXISTS organizer_applications_bank_verification_status_check;

ALTER TABLE organizer_applications
    ADD CONSTRAINT organizer_applications_bank_verification_status_check
    CHECK (bank_verification_status IN ('unverified', 'verified'));

-- Existing rows that already carry a complete account keep their current
-- standing rather than being reset to 'unverified': those details were reviewed
-- as part of the original application approval, and flagging them now would
-- raise a re-verification queue for accounts nobody has touched.
UPDATE organizer_applications
SET bank_verification_status = 'verified',
    bank_details_updated_at = COALESCE(reviewed_at, submitted_at)
WHERE status = 'approved'
  AND COALESCE(TRIM(bank_name), '') <> ''
  AND COALESCE(TRIM(bank_account_holder), '') <> ''
  AND COALESCE(TRIM(bank_account_number), '') <> '';

COMMIT;
