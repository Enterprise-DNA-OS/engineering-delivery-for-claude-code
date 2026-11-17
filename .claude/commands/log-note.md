---
description: Log note in the engineering delivery database
---

# log note

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- log-note --service=PORTAL --text="Agreed next step" --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --service, --text. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
