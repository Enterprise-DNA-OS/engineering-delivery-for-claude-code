---
description: Recover deployment in the engineering delivery database
---

# recover deployment

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- recover-deployment --deployment=REL-201 --at=2026-11-17T13:00:00Z --evidence=monitor://recovered --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --deployment, --at, --evidence. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
