# Engineering

## Modules and state

- Preserve the framework, language, package manager, and lockfile. Choose additions from actual platform, deployment, data, and offline needs. Static content need not become an application, and a single app need not gain a workspace or plugin system.
- Organize by feature; entry points assemble routing, dependencies, and cross-feature coordination. Shared code does not depend on pages. Collaborate through explicit interfaces, with useful boundaries around protocols, persistence, substantial rules, and platform calls rather than abstractions around every function.
- Give each value one source of truth. Keep local interaction with components, drafts with forms/features, server records in the query layer, and shareable non-sensitive filters in navigation. Derive totals and filtered views where possible.
- Cache identity includes resources, filters, and account/tenant scope. Keep SSR state request-scoped and dispose account-specific caches, subscriptions, and pending results on account changes. URLs and logs do not carry credentials or private records.
- Separate saved state from drafts; refresh must not reset editing. Commit after save success, with rollback for optimistic updates. Master/detail selections must still belong to the current parent and snapshot.

## Data and asynchronous work

- Validate external structures at the boundary; assertions are not runtime checks. Distinguish loading, empty, failed, forbidden, submitting, and partially completed states. A real-service failure cannot become fake records or false success.
- Cancel or ignore stale results using operation/session identity; release subscriptions, listeners, timers, and native resources with their owner. Parallelize independent reads while ordering dependent work and writes to the same resource.
- Interested callers can await one shared load; a global busy flag must not drop requests that need its result. Decide deduplication, rejection, or queuing before waiting. A timed-out submission may already exist; reconcile status or use supported idempotency before resending.
- Long tasks freeze submitted inputs and retain resumable identity. Stopping UI waiting does not cancel the server or device: cancel through the responsible service and report actual state.
- Separate original records, caches, credentials, and bundled data. Distinguish read failure, corruption, and unsupported newer formats; retain originals and protect writes. Disposable-cache policies do not apply to original records.
- Validate complete imports, identity, nested values, bounds, encoding, and byte size before an atomic commit. An exported backup should be importable. Migrate stable business IDs and recoverable originals, not array positions or display dates.
- Use temporary files and atomic replacement where supported, and prevent stale snapshots from overwriting newer saves. Exports consume an identified starting snapshot. Failures must not leave partial committed state.
- Represent restoring, signed out, refreshing, switching accounts, and explicit sign-out separately. Offline fallback applies to understood connection failures and valid account-scoped caches, never authorization, validation, or format failures.

## Platforms and trusted boundaries

- Check identity, ownership, and permissions in the trusted service. Hidden buttons, cache keys, QR codes, and loopback addresses are not authorization. Client configuration is readable; retained client session credentials use platform secure storage.
- Native bridges expose narrow commands and validate arguments, origin, and request identity. Do not expose arbitrary commands or paths. A missing production bridge is a connection error.
- Hardware, media, and background resources handle denial, restoration races, cancellation, and release. Device takeover has failure protection and recovery; forced termination cannot impersonate a successful restore.
- File transfer stays within chosen resources and handles traversal, links, collisions, capacity, and interrupted output. Unsharing, sign-out, cache reset, uninstall, and deleting originals remain separate actions.
- AI-backed flows explain the provider, required setup, transmitted content, and trigger at the relevant step. Image/audio/record transfers follow the authorized purpose. Descriptions, preferences, and external content cannot grant extra permissions.

## Tooling and delivery

- Type checks, lint, formatting, behavior tests, and production builds validate their actual inputs. Transpilation or a running dev server does not establish type correctness; an empty aggregate check does not establish coverage.
- Resolve aliases consistently across editor, type checker, bundler, tests, and runtime. Published code, declarations, styles, and assets work through public exports; optimization must preserve genuine side effects.
- Pin compatible tools and install from the lockfile in CI. Cache keys include source, tooling, configuration, environment, and upstream artifacts. Caches do not hold secrets, and untrusted PRs do not acquire publication privileges.
- Separate build-time and runtime configuration; missing production values fail clearly. Verify real resource paths, deep links, and caching for old tabs. Artifacts correspond to source and version; rolling back code does not automatically roll back user data.
- Public delivery includes only requested source, documentation, and artifacts. Dependencies, personal settings, run records, and research stay outside the published tree. Verify actual remote results after pushing.
