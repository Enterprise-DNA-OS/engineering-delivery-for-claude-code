# Engineering Delivery for Claude Code

This is a delivery review database for an engineering lead or owner. The initial business is Harbour Software, a fictional demo. Ask the operator for their business context when they customise it. Use real records, not memory.

## Work

Read before writing. Use npm run delivery -- help to inspect commands. Names can be partial and case insensitive, but ambiguity must be resolved before any write. Actual writes require --actor and actual timestamps. Names are labels, not authenticated identity. The database is the source of truth.

## One route for each job

| Ask | Recipe |
|---|---|
| services | /services |
| changes | /changes |
| review queue | /review-queue |
| release queue | /release-queue |
| failures | /failures |
| actions | /actions |
| quality | /quality |
| coverage | /coverage |
| deployments | /deployments |
| dora | /dora |
| investment | /investment |
| metric history | /metric-history |
| metric trend | /metric-trend |
| compliance | /compliance |
| activity | /activity |
| show | /show |
| weekly review | /weekly-review |
| add service | /add-service |
| set policy | /set-policy |
| add change | /add-change |
| amend change | /amend-change |
| record review | /record-review |
| merge change | /merge-change |
| add deployment | /add-deployment |
| link change | /link-change |
| flag failure | /flag-failure |
| recover deployment | /recover-deployment |
| add action | /add-action |
| close action | /close-action |
| log note | /log-note |
| import | /import |
| export | /export |
| draft weekly | /draft-weekly |
| draft followup | /draft-followup |
| Change fields or rules | /customise |
| Add a read-only report | /new-view |

Recipes live in .claude/commands/. All coding agents use the same files.

## Boundaries

Never send email or messages. Draft into drafts/. Never deploy software, merge source code, publish or delete records through this review system. A merge or deployment command only records an event that happened. Do not invent reviews, source events or deployment results. Keep source exports, reports and credentials out of Git. Never seed a production database.

Before changing definitions read docs/metrics.md. Imported vendor summaries and local calculations are different sources. Preserve units, date windows, missing values and sample counts. Do not turn counts into employee productivity scores.

Before changing policy checks read docs/compliance.md. Date prompts are local controls, not statutory deadlines. Public access is denied by default. Set up actual authentication and access controls before sharing.

## Files

scripts/delivery.mjs is the one domain CLI. scripts/lib/db.mjs selects PostgreSQL via DATABASE_URL or PGlite under DATA_DIR. supabase/migrations/ contains numbered migrations. views.json and documents.json define read-only HTML output. brand.json brands it. docs/replace-linearb.md is the import route. npm test uses an isolated temporary database.

Omni by Enterprise DNA installs, customises and runs the system: https://enterprisedna.co/omni/instead-of/linearb
