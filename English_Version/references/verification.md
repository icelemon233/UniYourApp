# Verification

Choose checks from the change and project requirements rather than file counts or a universal process template.

| Change | Evidence |
| --- | --- |
| Text or documentation | Facts, commands, references, and actual presentation |
| Business/data boundary | Key behaviors, invariants, failure, concurrency, recovery |
| UI text, layout, controls | Real interface, relevant states, input, affected shared callers |
| Native shell | Real windows, target DPI, system entries, lifecycle |
| Performance/rendering | Equivalent baseline, target environment, continuous behavior |
| Installation/runtime | Final payload and isolated maintenance scenarios |
| Configuration tools | Validation, origin, inheritance, conflicting saves, private scope, real editing |

- Run relevant repository checks against real source. Test behavior rather than mirrored constants or fixed phrasing; do not add meaningless coverage for reversible small edits.
- Select loading, empty, failed, forbidden, repeated-input, cancellation, fast-switching, and recovery cases by risk. Preserve user work and record uncommitted differences: a commit alone may not identify the running snapshot.
- Rebuild changed compiled artifacts/resources and bind evidence to the final version. Native hosts and Web content are distinct. DOM, constants, routing tests, and build success do not replace real visuals and input.
- Configured themes, viewports, DPI, and input methods supply targets, not permission to skip necessary checks. Unsupported environments remain accurately unverified; preferences cannot turn them into a pass.
- Observe performance during interaction and after input stops. Sparse stills are not a complete video; capture rate is not rendering rate. State the tool and capture-layer limits.
- Write tests with isolated recoverable data. Real records require task authorization, and screenshots/logs stay out of public source. Referenced evidence must exist.
- Mobile work distinguishes debug/release signing and simulator/device artifacts. Preserve upgrade identity/signing continuity and do not claim device acceptance without device evidence.
- For requested independent acceptance, define scope and use an available independent-review capability. This skill owns result standards, not models, sessions, desktop locks, or repair-round orchestration. Small changes do not automatically start independent review.
- Continue delivery once relevant checks pass; broaden or repeat only for new changes, failures, or unresolved concerns. Report changes, actual evidence, and limits without automatically adding installation, publication, or cleanup.
