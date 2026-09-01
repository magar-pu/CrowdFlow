# Migrations runbook

## How migrations work here

Migration files live in `backend/migrations/`, numbered (`0001_...` through
`0040_...` at the time of writing), but **adding a file to that directory
does nothing by itself**. `backend/migrations/run_all.sql` is the only thing
that applies migrations, and it lists every file explicitly — it does not
glob the directory. A migration that exists as a file but isn't registered
in `run_all.sql` will never reach anyone else's database, or any deployed
environment, no matter how correct the SQL inside it is.

Run it with:

```bash
psql "$DB_DSN" -f backend/migrations/run_all.sql
```

(or `psql -d crowdflow -f backend/migrations/run_all.sql` locally). It's
safe to run repeatedly — a ledger table (`crowdflow_migrations`) tracks what
has already been applied, and nothing recorded there is re-executed.

**This does not build a database from nothing.** `0001` already references
`users(id)` and `events(id)` — the base schema lives in `backend/db/`
(restored via `pg_restore`, not this runner), not in the migrations
directory. See [onboarding/README.md](../onboarding/README.md#4-set-up-the-database)
for the restore step. `run_all.sql` must be pointed at a database that
already has that base schema, or it fails immediately on the first
migration.

## Why a ledger, not just "run every file"

Most migrations here use `IF NOT EXISTS` guards and could technically be
replayed, but not all of them, so blindly re-running every file corrupts or
hard-errors a database that's already migrated:

- Several early migrations (`0001`/`0002`/`0003`/`0004`/`0010`) use bare
  `CREATE TABLE` / `CREATE TYPE` / `CREATE INDEX` — a second run is a hard
  error.
- `0006` uses a bare `ALTER TYPE ... ADD VALUE` — a second run is a hard
  error.
- `0004` seeds notifications with an **unguarded `INSERT`** — a second run
  silently duplicates those rows. This is the dangerous case: no error, just
  quietly wrong data.

So the ledger isn't bookkeeping — it's the actual correctness mechanism that
makes this runner safe to invoke on an already-migrated database.

## Every migration needs TWO entries in run_all.sql

This is the rule most likely to bite you, and it's bitten this project
before:

1. **The adopt list** — the `VALUES (...)` block inside the `\if :do_adopt`
   section. This is what makes the runner correctly skip a migration on an
   already-migrated database that never went through this ledger before (see
   next section).
2. **The apply step** — the actual `\set f '...' / \if :run_it / \ir ...`
   block, before the `-- Report` divider at the end of the file.

Registering only the apply step means an already-migrated database tries to
re-run the file (and, per the section above, some of those hard-error or
silently duplicate data). Registering only the adopt list means a genuinely
fresh database never gets the migration at all. **Both are required, in
filename order, matching where the files are applied.**

Apply-step template — copy verbatim, substitute the filename in all four
positions, and insert it immediately before the `-- Report` divider:

```sql
\set f '00NN_your_migration_name.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 00NN_your_migration_name.sql'
\ir 00NN_your_migration_name.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif
```

If the migration performs a **data backfill**, or isn't wrapped in its own
`BEGIN`/`COMMIT`, say so in both the `\echo` line and a comment above the
block — existing examples: `(backfills data)` on `0027`/`0030`/`0031`,
`(no BEGIN/COMMIT — not atomic)` on `0005`/`0006`/`0007`/etc.

Adopt-list probe — pairs the filename with a query that answers "does this
migration's artifact already exist?":

| Helper | Use for |
|---|---|
| `pg_temp.tbl('public.your_table')` | a new table |
| `pg_temp.col('your_table', 'your_column')` | a new column |
| `pg_temp.enum_has('your_enum', 'new_label')` | a new enum value |
| `pg_temp.con('your_constraint_name')` | a new constraint |
| `pg_temp.nullable('your_table', 'your_column')` | a column made nullable |

The probe must test something the migration **creates**, never something
that already existed — probing an existing artifact means the migration
gets wrongly adopted (marked applied) and silently skipped forever, even on
a database that genuinely needs it.

### Verify before you report a migration done

From `backend/migrations/`:

```bash
for f in $(ls *.sql | grep -v run_all); do
  adopt=$(grep -c "('$f'," run_all.sql)
  apply=$(grep -c "\\\\ir $f\$" run_all.sql)
  if [ "$adopt" -ne 1 ] || [ "$apply" -ne 1 ]; then
    echo "GAP: $f  adopt=$adopt apply=$apply"
  fi
done
```

This must print nothing. Any `GAP:` line names a migration that will not
reach other developers' machines or any deployed environment. Verified clean
against the current tree as of this writing (40 migration files, zero gaps).

### THE NEWEST FAILURE MODE — a registered migration file that was never committed

This just happened in this repo, so it's the concrete version of "verify
what actually reached the remote," not a hypothetical: migration `0040` was
correctly registered in both places in `run_all.sql`, and that change *was*
committed — but the migration file itself
(`backend/migrations/0040_inventory_db_backstop.sql`) was left **untracked**
and only got staged, not committed, in the same session. The result: a fresh
clone at that commit had a `run_all.sql` whose `\ir
0040_inventory_db_backstop.sql` line pointed at a file that did not exist in
the repo at all — `run_all.sql` aborts immediately on that missing `\ir`
target, so **every** migration after that point in the file also fails to
apply, not just 0040.

The two-entries-in-run_all.sql rule above doesn't catch this class of bug —
both entries were present and correct. What it needs in addition:

```bash
git status backend/migrations/   # anything still untracked/unstaged here?
git show --stat HEAD -- backend/migrations/   # did the .sql file itself land in the commit, not just run_all.sql?
```

**After committing a migration, verify the migration *file itself* is in the
commit — not just its two `run_all.sql` entries.** A migration is invisible
to git if it was never `git add`ed, exactly the same class of mistake as the
`*.md`-outside-`docs/` gitignore trap elsewhere in this project, just for a
different reason (forgot to stage, rather than blocked by `.gitignore`).

## Duplicate migration numbers — keyed by filename, never by number

Three numbers are reused: `0008` (`scanner_system`, `venue_layouts`), `0011`
(`qr_ticket_tokens`, `seat_tiering`), and `0014` (`dynamic_ticket_v2`,
`venue_postal_code`). The ledger table `crowdflow_migrations` is keyed by
**full filename**, not the leading number, specifically because of this —
keying on the number alone would record one migration and silently skip its
twin forever. Files apply in filename order (which sorts these adjacent
pairs correctly since the full filename, not just the prefix, determines
order).

## Adopting an already-migrated database

Every existing database (local dev machines that predate this runner,
sandbox, production) already has most migrations applied by hand or by an
earlier process, before this ledger existed. The first run against such a
database must not try to replay them.

This is handled automatically: when the ledger (`crowdflow_migrations`) is
**empty**, `run_all.sql` first probes for each migration's artifact using
the adopt-list helpers above and records the ones already present *without
executing them*. A genuinely fresh database (just restored from the base
dump, nothing more) has none of those artifacts, so nothing gets
adopted and every migration actually runs.

Adoption is gated on an **empty** ledger, not run every time — if it ran on
every invocation, a later migration whose column someone added by hand
outside this runner would get marked "adopted" and its data backfill would
be silently skipped.

This is sound because each migration file is atomic (wrapped in its own
`BEGIN`/`COMMIT`) — **except eight that have no `BEGIN`/`COMMIT` of their
own**: `0005`, `0006`, `0007`, `0008_scanner_system`, `0013`, `0015`,
`0017`, `0018`. If one of those ever fails partway through, it's left
part-applied and is *not* recorded in the ledger — fix the partial state by
hand before re-running.

## The hard rule: NEVER test a migration against a real database

This looks like it protects you and doesn't:

```sql
BEGIN;
\ir 00NN_whatever.sql
ROLLBACK;
```

Every migration file in this repo contains its **own** `BEGIN; ... COMMIT;`.
`psql` does not nest transactions — the migration's inner `BEGIN` just emits
`WARNING: there is already a transaction in progress` and is otherwise
ignored, but its **`COMMIT` is real** and ends the *outer* transaction. The
`ROLLBACK` that follows then has nothing left to roll back and warns `no
transaction in progress` — both warnings scroll past easily and the DDL has
already landed for real. This has actually dropped a table on a live local
database twice in this project before being caught (recovered from a
`pg_restore --schema-only` of an earlier backup).

**Do this instead** — a genuinely disposable scratch database:

```bash
createdb migtest_scratch
psql -d migtest_scratch -f backend/migrations/00NN_whatever.sql
dropdb migtest_scratch
```

To exercise a guard clause (like 0038's non-empty-table check below), seed
the scratch database with the row shape that should trip it first. Never
point migration testing at a database anyone is actually using, including
your own local `crowdflow` database if you use it for anything real.

## Migrations with real operational stakes — read before applying

**`0038_drop_user_bank_accounts.sql`** drops the (dead) buyer bank-account
table. It's guarded: it raises an exception naming the row count and
refuses to drop if the table isn't empty, rather than silently destroying
data. If you hit that exception on a database this hasn't run against
before, do not force it through — inspect
`SELECT * FROM user_bank_accounts;`, confirm with the team whether the rows
are genuinely disposable, and either truncate by hand and re-run, or replace
the guard with an explicit archival step. Idempotent otherwise — a no-op
once the table is gone.

**`0040_inventory_db_backstop.sql`** adds a partial unique index
(`tickets(event_seats_matrix_id) WHERE NOT NULL`, preventing two tickets
from claiming the same seat) and a `CHECK` constraint
(`ticket_tiers.tickets_sold <= allocation_limit`). Both fail to apply if
existing rows already violate them — run these two queries on the target
database *before* applying it:

```sql
SELECT event_seats_matrix_id, COUNT(*) FROM tickets
  WHERE event_seats_matrix_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
SELECT id FROM ticket_tiers WHERE tickets_sold > allocation_limit;
```

If either returns rows, **do not apply this migration on that database
yet** — it means real double-sold seats or over-quota tiers already exist
and need investigating first; the migration failing to apply is the correct
outcome in that case, not a bug in the migration.

## Deploys do not run migrations automatically

`deploy-main.sh` and `deploy-dev.sh` only pull and restart containers — see
[deployment.md](./deployment.md). There is no migration step in either
script or in the CI workflow. Run `run_all.sql` against a target database by
hand, and do it **before** deploying a release whose code depends on the new
schema — the backend does not check schema compatibility at startup beyond
whatever `database.EnsureSchema` happens to cover (see below).

## A second, separate schema mechanism you should know about

`backend/internal/platform/database/postgres.go`'s `EnsureSchema` runs a
small set of idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE
TABLE IF NOT EXISTS` statements directly from Go, on **every single backend
boot** — not just once, and not through `run_all.sql` at all. It's a
best-effort patcher for a couple of specific columns/tables
(`tickets.secret_key`, `events.end_time`, `ticket_access_otps`), and its
error is silently swallowed (`_, _ = db.Exec(query)`) — a failure here never
blocks the backend from starting. Worth knowing this exists so you don't go
looking for where `ticket_access_otps` is created in the migrations
directory and come up empty — it isn't there.
