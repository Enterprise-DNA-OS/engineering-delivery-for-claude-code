---
description: Import in the engineering delivery database
---

# import

Read docs/replace-linearb.md first. Inspect the actual headers and source units. Run the dry run, reconcile the counts and then remove --dry-run for the requested load. A changed value needs an explicit --update after reviewing its difference. This imports summaries only, never invented events.

```bash
npm run delivery -- import linearb --file=imports/delivery.csv --map=imports/delivery-map.json --scope=portal-team --actor="Your name" --dry-run --json
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --file, --map, --scope, --dry-run, --update. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
