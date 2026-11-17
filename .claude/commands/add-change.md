---
description: Add change in the engineering delivery database
---

# add change

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- add-change --code=PR-301 --service=PORTAL --title="Change title" --author="Author" --commit=2026-11-16T09:00:00Z --opened=2026-11-16T10:00:00Z --category=feature --additions=20 --deletions=5 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --code, --service, --title, --author, --commit, --opened, --additions, --deletions, --category, --source. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
