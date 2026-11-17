---
description: Merge change in the engineering delivery database
---

# merge change

This records an already-authorised merge event. It does not perform a Git merge. A current independent review must precede it.

```bash
npm run delivery -- merge-change --change=PR-101 --at=2026-11-17T11:00:00Z --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --change, --at. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
