# Windows

Preserve the framework, product identity, and installation method. Combine with [shared UI](ui.md) for content. Read only sections affected by window, system-entry, or installation work; an ordinary UI change does not start an upgrade.

## Windows, DPI, and input

- Distinguish DIP, physical pixels, browser zoom, and text scaling without applying scale twice. Cover negative monitor coordinates where relevant. Preferences describe design choices, not proof of correct hit testing.
- Custom chrome preserves dragging, double-click maximize, restore, snapping, system menus, keyboard, and resizing. Interactive controls are not drag targets; maximize/restore glyphs, names, tips, and actions follow real state.
- Assign press/release ownership to the system or application and clear state on lost capture, cancellation, deactivation, or release outside the target. Retain snap semantics and test resize priority where corners/edges overlap caption buttons or WebViews.
- Native children may not inherit parent hit testing. Correlate actual pointer coordinates, DPI, receiver, and before/after bounds through supported hosting paths. A correct parent result or transparent overlay is not outcome evidence.
- Maximize to the monitor work area and actual native frame, without hardcoded taskbar height. Check bottom content, auto-hide, and restored bounds; CSS corners do not prove native frame correctness.
- Native titles, menus, and WebViews adapt one resolved theme to their own semantic roles. Window, title, and tray resources may differ; check real frame selection, resolution, and display.

## Navigation and lifecycle

- Choose navigation for the product rather than imposing a sidebar or fixed window template. Overlays do not unexpectedly push content; keyboard focus, menus, and dragging remain usable. Persist explicit preference, not transient hover.
- Distinguish minimize, close, hide-to-tray, and process exit according to configuration or project conventions. Verify a working restoration entry before hiding. Reopening must not accidentally start duplicate services or writers.
- Real exit settles drafts, transfers, background work, connections, and device restoration. Failure remains actionable. Separate asynchronous cleanup from final destruction so synchronously completed awaits cannot reenter a close callback.
- Tray menus retain themes, DPI, keyboard, focus, Escape, and outside dismissal. Taskbar and notification-tray entries are separate checks. Release menus, image handles, and background instances on exit.
- Local services verify exclusive binding, browser-permitted ports, and actual instance/session identity, not just an open port or any HTTP 200. Desktop launch, phone pairing, and maintenance have distinct authorization.

## Resources and installation

- Separate display name, publisher, stable ID, install scope, and data location. Resolve resources from the application/framework, not working directories, source trees, or extractor temporary paths. Renames/upgrades preserve required identity continuity.
- Track artwork, master, and derivative provenance. Export for actual entries and DPI, then separately verify EXE, window, taskbar, tray, installer, uninstaller, and shortcuts. Build validation and visible display are different evidence.
- Investigate old imagery through running path, version, shortcut, and frame selection before altering caches. Do not default to clearing system-wide caches or changing unrelated entries. Distinct QA identity prevents guessing from a familiar icon.
- Check minimum OS, architecture, SDK assets, and runtimes with a cold launch of the final payload's new initialization path. Arbitrary development-machine DLL copies do not resolve unexplained deployment gaps; GUI programs should not unexpectedly create consoles.
- Keep installer-engine transaction, permission, cancellation, and uninstall semantics. Custom controls drive actual choices. Validate path, scope, and ownership before writing; reject dangerous roots and boundary-breaking links without overwriting unrelated files.
- Recognize per-user and machine installs separately. Upgrades retain scope, location, and shortcut choices; failed handoff retains drafts. Verify Unicode, quoting, and paths containing spaces or non-Latin text.
- Maintenance waits for this application's graceful exit and tasks, checking real process identity. Timeout or failed device restoration cannot become forced termination. Cancellation/failure verifies program, registration, and owned-entry recovery and preserves usable recovery material.
- Uninstall removes owned program/entry manifests while retaining settings, received files, and unrelated data; it does not recursively wipe the directory. Shared system runtimes are not casually rolled back or removed as app files.
- Before an authorized daily-install replacement, verify a complete recovery payload for the actual prior version. Installation rollback differs from a later downgrade, which requires program/data compatibility rather than deleting data to accommodate an old build.

## Verification

Isolate directories, data, registration, shortcuts, and locks for maintenance tests. Exercise affected native dragging, resizing, snapping, tray, keyboard, and target DPI. Observe actual responsiveness during UI-thread pressure. Verify final versions, hashes, dependencies, and entries, distinguishing source, simulated, real-input, physical-device, and installed results.
