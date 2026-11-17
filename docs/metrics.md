# Definitions you can inspect

All timestamps use UTC. --from is an inclusive calendar date and --to is exclusive. The default window is the 30 calendar days ending at the start of tomorrow UTC, so today's recorded events are included. It is a fixed calendar window, including the unfinished current day. Frequency divides by that full window, not only days with an event.

The dora command reports each service separately. It uses production deployments only. Based on [DORA's current five measures](https://dora.dev/guides/dora-metrics/), checked 17 November 2026:

| Measure | This build's calculation |
|---|---|
| Deployment frequency | Production deployments in the window divided by calendar days in the window |
| Change lead time | Median hours from each change's first commit to its first production deployment. Include changes whose first production deployment falls in the window. Repeated deployments of a change count once. |
| Change failure rate | Production deployments in the window with a recorded failure divided by all production deployments in the window |
| Failed deployment recovery time | Median hours from the recorded failure onset to recorded recovery, for deployments in the window that have recovered |
| Deployment rework rate | Production deployments in the window explicitly recorded as unplanned incident rework divided by all production deployments in the window |

Failure onset is an operator-supplied timestamp. Recovery includes only resolved failures and has a separate sample count and unresolved count. A zero denominator produces unknown, not zero. No lead-time observations produces unknown. The report shows unlinked deployment counts so missing change links remain visible. Reporting is based on the facts recorded now, including recovery recorded after the selected deployment window. observed_at states when the report ran. This is not a frozen historical as-of snapshot.

Local change category counts and changed lines describe the records. They do not measure staff performance, effort, productive hours or monetary value. A review record is an operator assertion with an evidence reference, not an authenticated code-host approval.

Imported LinearB summaries keep their own source units and aggregation. The build does not claim its definitions reproduce LinearB's proprietary calculations. A metric-trend compares consecutive observations only within the same source scope, metric, unit and aggregation. Missing values stay unknown. A difference between overlapping periods is not a measure of causal improvement.

DORA measures belong at service level and support improvement conversations. Do not rank people or compare unlike services using these figures.
