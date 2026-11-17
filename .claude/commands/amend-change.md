---
description: Amend change in the engineering delivery database
---

# amend change

Read the record first. Amending an open change increments its revision, making earlier reviews stale. Merged changes cannot be amended.

```bash
npm run delivery -- amend-change --change=PR-101 --title="Revised title" --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --change, --title, --additions, --deletions, --category. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
