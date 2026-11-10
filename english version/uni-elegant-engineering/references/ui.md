# Shared UI

**Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.**

## Information and structure

- Begin with information and actions needed for the current task. Use grouping, alignment, proximity, hierarchy, and whitespace. Do not automatically add subtitles, eyebrows, badges, or explanations to every region, card, record, or control.
- Secondary text must help identify content, understand a necessary condition, resolve ambiguity, or act; merely adding new information is insufficient. Omit repetition already conveyed by a field name, button, visible value, or layout.
- Preserve action names, field labels, units, errors, and accessible names. An icon button can have an accessible name without a permanent explanatory line. Remove dedicated wrappers, spacing, and reserved height with redundant text, including loaded and navigated states.
- Shared guidance does not prescribe a brand, character, fixed palette, or universal window template. Read the project's tokens and private preferences, retain its confirmed direction, and keep a focused fix from becoming a global restyle.

## Actual geometry and visual roles

- Maintain colors, typography, spacing, and state from one project-owned source. Distinguish surfaces, body and secondary text, links, primary actions, selection, focus, and danger; update text and interaction roles when backgrounds change.
- Boundaries express actual groups, without nested decorative cards. Inputs, menus, overlays, selection, and warnings retain functional surfaces. Recheck spacing after changing backgrounds rather than leaving unexplained card-sized gaps.
- One layer owns an adjacent gap. Account for parent gap, child margins, component padding, line boxes, separators, and hit areas. Measure visible frames, glyphs, and targets separately; avoid offsets, clipping, and smaller targets to disguise misalignment.
- Long content, languages, and text scaling can increase height or reflow. Values, decorative arrows, and clickable clear controls have separate space. Equal-height layouts require correct inner backgrounds and flexible content, not blank subtitles or filler nodes.
- Typography overrides retain language fallbacks and use production fonts for real glyph and weight checks. Functional icons, identity, and illustrations have different roles; runtime resources must not depend on a skill installation.

## Input and feedback

- Give a decision group clear action hierarchy and consistent button geometry while keeping navigation semantics. Selection remains visible on hover/press, and focus, borders, and weight do not move layout.
- Separate actual focus from keyboard indication. Pointer focus, modifier keys, and system shortcuts do not automatically become keyboard navigation. Do not globally hide focus or blur every clicked control.
- Keep labels, values, required state, disabled state, validation, and errors associated with their fields. Menus/dialogs preserve Tab, arrows, Enter, Space, Escape, appropriate outside dismissal, and focus return. Draw one coherent focus treatment around each complete interactive object.
- Check the actual background: ordinary text needs at least 4.5:1 contrast; essential control/focus boundaries at least 3:1. Decorative separators do not replace identifiable controls. Verify themes and custom surfaces separately.
- Loading retains drafts and readable content. Success follows actual completion. Actions such as copying that otherwise have no visible result get short feedback; later failure clears stale success.
- Determinate progress requires valid finite totals and a meaningful current value. Waiting, indeterminate work, cancellation, partial results, and completion differ; invalid values must not be clamped into a false 100%.
- Motion communicates feedback, respects reduced motion, and stops when work ends. Do not add motion to meet a count. Explicit platform-immediate feedback takes precedence over general transitions.

## Correction and inspection

Reproduce the problem on the real surface, trace the shared implementation, and inspect affected callers. More explanation cannot close a grouping or spacing defect. Cover relevant themes, content lengths, narrow bounds, text scaling, and inputs. Constants, DOM presence, and one screenshot each provide only partial evidence.
