---
description: Link change in the engineering delivery database
---

# link change

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- link-change --deployment=REL-301 --change=PR-101 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --deployment, --change. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
