---
description: Close action in the engineering delivery database
---

# close action

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- close-action --action=ACT-1 --evidence=review://follow-up --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --action, --evidence. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
