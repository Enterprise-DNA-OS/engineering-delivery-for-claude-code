---
description: Record review in the engineering delivery database
---

# record review

Use the actual reviewer, event timestamp and evidence reference. The reviewer must differ from the author. Record only reviews that really happened for the current revision.

```bash
npm run delivery -- record-review --change=PR-101 --reviewer="Independent reviewer" --at=2026-11-17T10:00:00Z --evidence=review://approved --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --change, --reviewer, --at, --evidence. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
