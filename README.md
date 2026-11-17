# Engineering Delivery for Claude Code

See what is waiting for review, what has merged but has not reached production, and which failed release still needs recovery evidence. Keep the records and the definitions in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free under MIT. Install and explore the fictional demo. | Your delivery rules, LinearB summaries, source connections and reports. One setup fee, then a retainer. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=linearb) · [Instead of LinearB](https://enterprisedna.co/omni/instead-of/linearb)

## Try it

Node 20 or later:

```bash
npm install
npm run demo
npm run delivery -- dora
npm run view
npm run docs
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md points to the same CLAUDE.md and slash-command recipes. PGlite stores an embedded database in .data/db. DATABASE_URL selects PostgreSQL, and DATA_DIR selects a local data directory. Never seed a production database. Shared-database demo seeding requires --demo-database.

LinearB lists Essentials at US$29 per user per month billed annually for teams with 50 or more developers. At 50 users that is US$17,400 a year in subscription arithmetic, not a customer invoice. [Pricing](https://linearb.io/pricing), checked 17 November 2026. [Candidate scores and limits](docs/research.md).

## What you own

Services, changes, reviews, deployments, release links, improvement actions, imported metric summaries and a before-and-after activity log. The demo contains an oversized waiting review, a stale review after a revision, a merged change only deployed to staging, an unresolved production failure, overdue actions and a service without records.

This base works offline. It does not host code, deploy software, collect events automatically or reproduce every LinearB feature. Enterprise DNA scopes those connections and any web front end around your requirements. [Why no front end](docs/why-no-front-end.md).

## Weekly work

Start with /weekly-review. Review /review-queue, /release-queue and /failures, then assign /add-action. Review /dora at service level and /metric-trend for imported vendor summaries. Check /compliance for missing policy evidence. /draft-weekly and /draft-followup write local drafts and never send.

The build ships 35 CLI commands and 37 slash-command recipes. Every CLI command accepts --json. Flags use --name=value, and writes require --actor. Exact codes, partial IDs and case-insensitive names work. Ambiguous matches list candidates and fail. Unknown flags fail, including misspelled dry-run flags. Run npm run delivery -- help for the complete command list.

A merge needs a current independent review with evidence. An amendment increments the revision and invalidates earlier reviews. Deployment links must belong to the same service and follow merge time. Recovery must follow a recorded failure. Closing an action requires evidence. Actor labels are assertions, not authenticated identities or tamper-proof signatures.

## Ten questions this build answers today

These are tested questions, not claims that LinearB cannot report on delivery. The additional policy and action records belong to your version.

1. Which changes are waiting for a review of their current revision? review-queue.
2. Which merged changes have still not reached production? release-queue.
3. Which production failures remain unresolved? failures.
4. Which improvement actions are overdue and who owns them? actions.
5. Which services have no delivery records? coverage.
6. How much change lead time and failed-release recovery time did each service record? dora.
7. Which changes were merged without independent review evidence? quality.
8. What share of recorded changes is still unclassified? investment.
9. Which imported metric changed between periods without mixing units or teams? metric-trend.
10. Which services need a purpose, retention or access review? compliance.

## Import LinearB in one command

Export the required dashboard CSV, record its filters and map its date, metric, unit and aggregation labels. The included fixture is illustrative, using the vendor's documented layout:

```bash
npm run delivery -- import linearb --file=fixtures/linearb-dashboard.csv --map=fixtures/linearb-map.json --scope=demo-portal --actor=Demo --dry-run --json
```

Remove --dry-run to load it. Import is atomic, repeatable and preserves missing values as unknown. Changed historical values need --update. It retains raw rows and source hashes. Summaries do not become invented change or deployment events. [Full export, mapping and reconciliation guide](docs/replace-linearb.md).

npm run delivery -- export writes a private JSON archive of every domain and audit record into exports/. It is a portable archive, not a substitute for tested database backups. Keep imports/, exports/, .data/, generated views, documents and drafts out of Git.

## Measures and documents

The dora command reports the five current delivery measures per service, with sample counts, unresolved failures and missing links visible. Zero denominators stay unknown. [Exact definitions and time windows](docs/metrics.md).

Change brand.json to use your business name, colours and local logo. npm run view produces week, quality and coverage snapshots. npm run docs produces service delivery reviews, failed-release recovery records and improvement registers. Local SQL views power the reports. No server or application front end is required.

## Your first hour: ten things to ask for

1. Put our business name and logo on the delivery review.
2. Import a dashboard export for one team and compare the figures.
3. Add our service owners.
4. Record the actual release and recovery times for a failed deployment.
5. Show changes waiting for a fresh review.
6. Add our release ticket reference to a deployment.
7. Rename our change categories and migrate the old values.
8. Add our own service review window.
9. Draft the week's follow-up actions.
10. Record our data purpose and retention-review dates.

/customise writes and applies a migration, updates affected commands and verifies the result. /new-view adds a read-only report from the records.

## Verification and operating boundary

npm test runs against an isolated temporary PGlite database, applies migrations twice, seeds twice, exercises every CLI command, and tests time windows, metric denominators, review gates, source mapping, import rollback, duplicate handling, exports, drafts and HTML escaping. CI runs Node 20/22 on Linux and Windows and a disposable PostgreSQL database. Check the actual CI result before claiming a platform passed.

Public privileges are revoked and domain tables have row-level security without public policies. The trusted database owner can access all records. Configure real identity, permissions, backups and a retention process before sharing. [Record checks and cited sources](docs/compliance.md). Hosting and coding-agent usage have their own costs.

Enterprise DNA builds your version, brings across agreed LinearB records and runs it through Omni by Enterprise DNA for one setup fee and then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=linearb).

MIT. Not affiliated with LinearB or Anthropic.
