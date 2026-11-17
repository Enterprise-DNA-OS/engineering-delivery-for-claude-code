---
description: Show in the engineering delivery database
---

# show

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- show --type=changes --ref=PR-101
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --type, --ref. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
