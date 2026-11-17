# Record checks and their limits

The compliance command returns exceptions. These are record checks that help an owner review policy, not a legal compliance certificate or a security audit. No statutory retention duration is invented.

Sources checked 17 November 2026:

| Rule | Record check | Source |
|---|---|---|
| PURPOSE | A service needs a stated collection purpose and staff-notice reference | [NZ Privacy Principle 1](https://www.privacy.org.nz/privacy-principles/1/) requires necessary collection for a lawful purpose. The notice reference is our local evidence convention. |
| RETENTION | Missing or overdue retention-review date | [NZ Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention to the required lawful purpose. A review date is an owner-set prompt, not a statutory deletion date. |
| ACCESS | Missing or overdue access-review date | [NZ Privacy Principle 5](https://www.privacy.org.nz/privacy-principles/5/) requires reasonable safeguards. A dated review cannot establish that safeguards are effective. |
| UNLINKED_RELEASE | Production deployment has no linked change records | [DORA measures](https://dora.dev/guides/dora-metrics/) need source evidence. This check concerns measurement completeness, not legislation. |

## Local policy

INDEPENDENT_REVIEW flags merged changes without a review for their current revision from someone other than their author. New merges through the CLI require that review, an evidence reference and timestamps in order. Amending an unmerged change increments its revision, so previous reviews no longer satisfy the merge gate. The demo deliberately contains a historical unreviewed merge to make the exception visible.

UNRESOLVED_FAILURE flags production failures without recovery. A recovery record requires an evidence reference and a timestamp after failure. A closed improvement action requires evidence. These are local operating rules, not vendor requirements or legal obligations.

Every domain write is logged with before and after values and an operator-supplied actor. These names are not authentication. Database owners can change records and logs. Use a trusted operator account and establish identity, access, backup and retention controls before sharing the database. Public database privileges are revoked and row-level security has no public policies. Views are for the trusted database owner and are not a public access boundary.

This base does not assign employment scores or issue legal determinations. Agree the purpose and staff notice before loading personal records. Review identifiers retained in exports, drafts and raw imported rows as well as the database. Deletion and redaction require an owner-approved procedure that also addresses audit history and backups.
