# Bring your LinearB summaries across

LinearB documents dashboard CSV exports with one metric widget per column and one date range per row. Export availability covers standard Delivery, Quality, Throughput and DORA boards, plus personal boards using standard metrics. Custom project-management metric reports are excluded from that export. Resource Allocation has its own export and is outside this importer.

Source, checked 17 November 2026: [Sharing LinearB Metrics and Projects](https://linearb.helpdocs.io/article/12miefwqfm-how-can-i-share-my-linear-b-metrics).

1. Open the dashboard in LinearB. Choose the team or service filters and date range you intend to retain. Record the selected filters because a dashboard export need not repeat them on each row.
2. Use Share, then Export as CSV. Keep the original in private storage. Export each required dashboard separately.
3. Copy fixtures/linearb-map.json into imports/ and map the actual date and metric headers. Each metric needs its name, unit and aggregation as configured on the source widget. Units are not inferred or converted. The fixture follows the documented wide layout, but its labels and figures are illustrative, not an assertion of fixed vendor headers.
4. Run one command for the complete file, first as a test:

```bash
npm run delivery -- import linearb --file=imports/delivery.csv --map=imports/delivery-map.json --scope=portal-team --actor="Your name" --dry-run --json
```

Remove --dry-run to load it. Use --update only after checking any changed historical value. The import runs as one transaction: a bad row, duplicate period or conflicting value rolls back the entire file and its audit entries. Repeating the same file, scope and mapping is a no-op. A changed file with the same values retains the earlier observation. Every stored observation keeps its raw row, source value, file hash and mapping.

The range column accepts ISO ranges such as 2026-11-02 to 2026-11-08, including a spaced hyphen or en dash separator. Alternatively use {"start":"Start","end":"End","metrics":{...}} for separate ISO date columns. If the export presents dates in a regional style, retain the original and normalise just those cells in a copy. The importer rejects ambiguous dates rather than guessing day and month. The supplied fixture is a runnable example, not a downloaded customer export.

Blank, null, n/a and - values remain unknown. Numeric zero stays zero. Comma thousands separators work. Values containing units or percent signs must be normalised to numeric text in a copy, with the unit stated in the map. CSV quoting, embedded newlines, BOM and CRLF are supported. All unmapped columns are retained in each raw row. Do not import personal identifiers you do not need.

After loading, compare row counts, periods, units and sample values with the source. Run metric-history and metric-trend with the same scope. Do not combine team scopes or averages as if they were raw observations. Overlapping periods remain labelled; trend differences are descriptive, not statistical significance.

## What carries over

The exported metric observations, selected period boundaries, scope you supply, column mapping and original cell values. All metric columns you map can be retained, including Delivery, Quality, Throughput and DORA dashboard widgets. A vendor summary is kept as a vendor summary. The local five-measure report is calculated separately from change and deployment records.

## What needs separate collection

A summary CSV cannot reconstruct individual changes, review events, deployments, incidents, users, permissions, workflow automation or source code. Record these using the local commands, or commission and validate a connection to your source-control and deployment systems. Exported vendor averages and percentiles are never reverse-engineered into invented events. No credentials or live vendor connection are needed to use the files.

Run both sets of reports over an agreed period, reconcile the definitions and approve the required connections before retiring LinearB. The free base supports offline review and owned history. Enterprise DNA maps your exports and builds the required connections as part of your version, for one setup fee and then a retainer through Omni by Enterprise DNA.
