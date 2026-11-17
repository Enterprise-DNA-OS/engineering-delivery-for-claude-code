---
description: Add service in the engineering delivery database
---

# add service

Read the relevant records and use the actual facts supplied by the operator. Present the result and identify missing information.

```bash
npm run delivery -- add-service --code=PAYMENTS --name="Payments service" --owner="Owner name" --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --code, --name, --owner, --purpose, --notice, --retention-review, --access-review. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
