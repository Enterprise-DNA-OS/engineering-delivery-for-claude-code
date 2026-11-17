---
description: Weekly review in the engineering delivery database
---

# weekly review

Read review-queue, release-queue and failures, then the action queue. Name the oldest waits, the unresolved failures and the people who own the follow-up. Do not treat missing records as zero activity.

```bash
npm run delivery -- weekly-review
```

Examples use fictional names and dates. Substitute verified values before writing. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
