---
description: Export in the engineering delivery database
---

# export

The output contains private data and audit history. Keep it in ignored exports/. This is a portable JSON archive, not proof that backups can be restored.

```bash
npm run delivery -- export
```

Examples use fictional names and dates. Substitute verified values before writing. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
