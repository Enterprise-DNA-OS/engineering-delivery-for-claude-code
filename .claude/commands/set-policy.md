---
description: Set policy in the engineering delivery database
---

# set policy

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- set-policy --service=PORTAL --purpose="Improve team delivery" --notice=policy://staff-notice --retention-review=2027-01-01 --access-review=2027-01-01 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --service, --purpose, --notice, --retention-review, --access-review. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
