---
description: Add deployment in the engineering delivery database
---

# add deployment

This records a deployment that happened. It never deploys software. Use the actual timestamp and environment. Link only merged changes belonging to the same service. Rework is an unplanned incident-driven release and requires --rework and --reason.

```bash
npm run delivery -- add-deployment --code=REL-301 --service=PORTAL --version=1.5.0 --environment=production --at=2026-11-17T12:00:00Z --changes=PR-101 --evidence=release://301 --actor="Your name"
```

Examples use fictional names and dates. Substitute verified values before writing. Supported flags: --code, --service, --version, --environment, --at, --changes, --rework, --reason, --evidence. Use --json for structured output. Writes require --actor. Ambiguous names list candidates and stop. Never send, publish, delete or infer a record that is not present.
