# Reference

Lookup material — tables you check rather than documents you read through.

| Document | Contents |
|---|---|
| [routing.md](./routing.md) | Every frontend route and every backend API prefix, including which packages are unversioned and why |
| [auditor-and-payouts.md](./auditor-and-payouts.md) | The three auditor workflows: organizer verification, payout review, event review — plus an explicit list of what was specified but never built |
| [system-analysis.md](./system-analysis.md) | Whole-system overview: problem, objectives, architecture, use cases, verification, future work |

For request and response schemas, see [../swagger.yaml](../swagger.yaml)
(OpenAPI 3.0.3, 163 paths).

## Note on provenance

These documents replace an earlier set of specification drafts
(`PORTAL_ROUTING_STRUCTURE.md`, `PAYOUT_MODULE.md`, `AUDITOR_FEATURES2.md`,
`SYSTEM_ANALYSIS_AND_PRESENTATION_DRAFT.md`) that described intended behaviour
rather than shipped behaviour — in places for a different technology stack
entirely. They have been rewritten against the code.

Where a feature was specified but not built, it is listed under an explicit
"Not built" heading rather than described in the present tense. Keep that
convention when you edit these files.
