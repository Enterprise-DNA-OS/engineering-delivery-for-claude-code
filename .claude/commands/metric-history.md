---
description: Metric history in the engineering delivery database
---

# metric history

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- metric-history --scope=demo-portal
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --scope, --metric. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
