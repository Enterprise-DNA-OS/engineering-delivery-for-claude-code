---
description: Flag failure in the engineering delivery database
---

# flag failure

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- flag-failure --deployment=REL-301 --at=2026-11-17T12:15:00Z --reason="Observed failure" --evidence=incident://301 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --deployment, --at, --reason, --evidence. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
