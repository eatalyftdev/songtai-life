---
name: Supabase pooler connection quirks
description: Gotchas hit when connecting Replit's sandbox to a Supabase Postgres project via pooler, and how to tell projects apart.
---

## Session pooler (5432) can reject a password the transaction pooler (6543) accepts
On one project, `postgres.<ref>@<region>.pooler.supabase.com:5432` (session mode) returned
"password authentication failed" for a password that worked fine on `:6543` (transaction mode)
with the identical username/password. If session-pooler auth fails but you're sure the password
is right, retry on port 6543 before assuming the password itself is wrong.

**How to apply:** when a Supabase DB connection fails auth, try both ports before asking the user
to reset their password.

## Verify project identity by schema, not just by ref string the user recalls
A user can misremember/confuse which Supabase project ref belongs to which app, especially across
multiple projects in one org. Before trusting a project ref, connect and list
`information_schema.tables` — an unrelated app's tables (e.g. totally different domain nouns) is a
strong signal you're on the wrong project, even if the user insists otherwise. Confirm with them
using concrete evidence (actual table names) rather than re-trying blindly.

## Idempotent "ALL_MIGRATIONS_COMBINED.sql"-style seed files can still break on re-run
A combined migrations+seed file marked "idempotent" used `create table if not exists` for schema
but plain `insert` (not `on conflict do nothing`) or column-dependent seeds for some sections. If a
table already exists from a prior partial run but is missing a column a later seed insert expects
(e.g. `category_id`), the whole script aborts mid-file. Fix by patching the missing column with
`alter table ... add column if not exists ...` before re-running, rather than trying to run the file
piecemeal.
