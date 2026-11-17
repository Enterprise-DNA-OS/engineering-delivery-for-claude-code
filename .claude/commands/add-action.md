---
description: Add action in the engineering delivery database
---

# add action

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- add-action --code=ACT-301 --service=PORTAL --title="Follow-up action" --owner="Owner name" --due=2026-11-20 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --code, --service, --title, --owner, --due. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
