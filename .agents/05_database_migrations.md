# Database Migration Rules

Future agents working on this codebase must adhere to the following migration rules. A migration that exists as a file but is not registered in `run_all.sql` is invisible: it will never be applied to any database except the one the author ran it against by hand.

## 1. Every Migration Must Be Registered in `run_all.sql`

* Adding a file to `backend/migrations/` is **not** enough. `run_all.sql` is the only thing that applies migrations, and it lists them explicitly — it does not glob the directory.
* Every new migration must be added in **two** places in `backend/migrations/run_all.sql`:
  1. The **adopt list** (the `VALUES (...)` block), which records the migration as already applied when an existing database is first adopted.
  2. The **apply step**, which actually runs the file.
* Both entries are mandatory. Registering only the apply step means an already-migrated database will try to re-run the file; registering only the adopt list means a fresh database never gets it.
* Entries in both places must stay in **filename order**, matching the order the files are applied.

## 2. Apply Step Template

Append a new block immediately before the `-- Report` divider at the end of the file. Copy this verbatim and substitute the filename in all four positions:

```sql
\set f '0030_your_migration_name.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0030_your_migration_name.sql'
\ir 0030_your_migration_name.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif
```

* If the migration performs a **data backfill**, or is **not wrapped in `BEGIN`/`COMMIT`**, say so in the `\echo` line and in a comment above the block. Existing examples: `(backfills data)` on 0027, `(no BEGIN/COMMIT — not atomic)` on 0005.

## 3. Adopt List Probe

* The adopt list pairs each filename with a probe that answers *is this migration's artifact already present?* Use the `pg_temp` helper that matches what the migration created:
  * `pg_temp.tbl('public.your_table')` — new table
  * `pg_temp.col('your_table', 'your_column')` — new column
  * `pg_temp.enum_has('your_enum', 'new_label')` — new enum value
  * `pg_temp.con('your_constraint_name')` — new constraint
  * `pg_temp.nullable('your_table', 'your_column')` — a column made nullable
* The probe must test something the migration **creates**, not something that already existed, or the migration will be wrongly adopted and skipped forever.
* Remember to add a comma to the previous line when appending — the last entry in the list has no trailing comma.

## 4. The Version Key Is a Filename, Never a Number

* The ledger table `crowdflow_migrations` is keyed by full filename because three version numbers are reused: `0008` (scanner_system, venue_layouts), `0011` (qr_ticket_tokens, seat_tiering) and `0014` (dynamic_ticket_v2, venue_postal_code).
* Never key, probe, or dedupe on the number alone. Doing so records one migration and silently skips its twin.

## 5. Migrations Must Be Written to Be Registered Safely

* Prefer `IF NOT EXISTS` / `IF EXISTS` guards, and wrap the migration in `BEGIN` / `COMMIT` so it is atomic. Adoption is only sound because an atomic migration's artifact proves the whole file completed.
* Never add an **unguarded `INSERT`** that seeds rows. If such a migration is ever replayed it silently duplicates data — the failure mode that leaves no error behind (see 0004).
* `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that added it, so a migration adding enum labels must not also backfill using them. Split the backfill into a later migration (see 0023).

## 6. Verification Before Reporting Done

* After adding a migration, confirm it is registered in both places. From `backend/migrations/`:

  ```bash
  for f in $(ls *.sql | grep -v run_all); do
    adopt=$(grep -c "('$f'," run_all.sql)
    apply=$(grep -c "\\\\ir $f\$" run_all.sql)
    if [ "$adopt" -ne 1 ] || [ "$apply" -ne 1 ]; then
      echo "GAP: $f  adopt=$adopt apply=$apply"
    fi
  done
  ```

* The loop must print nothing. Any `GAP:` line is a migration that will not reach other developers' databases or any deployed environment.
* State in the task report which migration number was added and whether it has been applied locally. Never assume applying it locally means it is applied anywhere else.

## 7. This Runner Does Not Build a Database From Nothing

* `0001` already references `users(id)` and `events(id)`. The base schema lives in `backend/db/`, not in the migrations directory.
* `run_all.sql` must be pointed at a database that already has that base schema.
