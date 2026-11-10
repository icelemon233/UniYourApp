# Web

Use with [shared UI](ui.md), reading only the affected sections.

## Layout, controls, and navigation

- Identify the actual layer: native control, component library, custom wrapper, startup HTML, application renderer, or no-script page. Inspect real DOM slots and installed SDK APIs rather than confusing similarly named components across frameworks.
- Related pages share outer widths, margins, and breakpoints; a reading column can be a purposeful exception. Count margins and scrollbar occupancy once, place page scrolling at the workspace edge, and avoid fixed OS scrollbar widths.
- Preserve URLs, deep links, refresh, and back/forward. Use buttons for local actions. Long identity and navigation have usable independent space; narrow layouts follow reading order, while keyboards, safe areas, and fixed bars leave input and submission reachable.
- Apply shrinking and wrapping to the actual layout participant. Range fields and their connector form a complete unit; stretched empty slots do not accidentally become links or pointer targets.
- Measure peer frames, glyphs, arrows, icons, and hit regions, including generated library buttons and native date fields. Broad class selectors must not apply root geometry to every inner slot.
- Custom select menus preserve real form values, native fallback, accessible naming, selection, keyboard behavior, and focus return. Constrain or reverse a popup using actual trigger/viewport bounds; offsets alone do not fix a tall panel covering its trigger.
- Establish scrollbar ownership and reserve its maximum hovered/dragged footprint. Keep one track per region while preserving genuine nested scrolling and restoration; scrolling a menu should not unexpectedly scroll the page.
- Empty states occupy their owning region; whole-grid emptiness spans columns, and vertical stretch needs actual parent space. Media overlays belong to the viewport rather than enlarging image scroll extent. Editable/native media surfaces retain their own shortcuts.
- Apply language, fonts, and accessible naming to generated buttons, clear controls, menus, and errors. CSS, framework, and DOM accessibility layers agree on visible focus; test a real first click rather than preconditioning focus.

## Startup and multiple renderers

- Generate shared color, type, and size contracts from one source. Handoff reads the latest theme, URL, drafts, filters, pagination, and scroll position rather than replaying a boot snapshot. Dispose old listeners and overlays after takeover.
- Progressive enhancement retains usable native form behavior. Promised no-script reading keeps complete content and only functioning controls. Adopting DOMParser content must not activate styles intended solely for noscript.
- Distinguish network, runtime initialization, view construction, and decoding. Submit lightweight feedback before expensive construction; a skeleton painted after heavy work in the same frame is not earlier feedback. Readable content and same-page updates need not return to skeletons or wait for an artificial minimum animation time.
- Skeletons follow actual structure, themes, and responsive layout without fake interactive controls or repeated accessibility announcements. Both image success and failure end loading. Abort, failure, timeout, and navigation exit placeholders correctly; only current requests replace content.
- Check actual installed APIs for Flutter Web and other multi-layer frameworks. Local text overrides may lose fallbacks, foreground overrides may restore overlays, and tall menus may be pushed over their triggers. Verify actual glyphs, states, and panel bounds.

## Performance and charts

- Compare equivalent baselines on the target browser, viewport, DPR, refresh rate, and renderer. Idle paints, automation wheel frequency, and recording frame rate do not establish application smoothness.
- Address measured request, main-thread, layout, paint, decode, or rebuild costs. Virtual lists preserve identity, anchors, focus, and selection; metadata updates retain loaded pages rather than keeping scrollTop while collapsing to the initial page.
- Resize observation, track visibility, and width-dependent height can form feedback loops. Observe after input stops and stabilize the responsible dimensions instead of hiding tracks or clipping content.
- Rendering keys do not use measured sizes or floating positions. Measure whole-page theme interpolation before choosing atomic changes with local transitions. Renderer changes require font, asset version, MIME, capability-fallback, and worker checks.
- Charts use actual available width without shrinking labels through a huge viewBox. Distinguish absent, zero, and estimated values; never fabricate data. Use current surface colors, anchor capacity labels to the complete container, and prevent negative small-block sizes.

## Verification

Exercise affected pointer, keyboard, touch, narrow layouts, long values, text scaling, and themes. Handoffs require cold-start, rapid-navigation, and current-draft checks. Native hosts receive separate verification. Record the actual layer, measurement conditions, and tool limitations.
