# Writing a repository README

Write for someone deciding whether to use the project and trying it for the first time. Establish the actual audience, supported entry point, and expected result before arranging sections. The README is a user-facing entrance; detailed agent instructions, personal profiles, and maintenance records have their own files.

## Establish the facts

Read the current README, project instructions, package metadata, working installation path, and a representative user flow. Verify support claims and prerequisites against the implementation. Keep the product's actual name, scope, and language choice. Do not infer public identity or configuration from a developer's machine.

When comparative research is requested, use genuinely comparable projects: a single skill, a skill collection, a workflow framework, and a directory have different readers. Verify requested selection criteria through current primary metadata, then read the actual default-branch READMEs. Prefer personal-account projects when requested without assuming they have no team or contributors. Stars are a selection criterion, not evidence that a writing choice caused adoption. Do not make a particular sample size or star threshold mandatory for ordinary edits.

## Give the reader a short path

- Start with the real project name and a direct description of what it helps the reader do. Add a differentiating fact only if it changes the decision to use it. Do not stack a slogan, a subtitle, and another paragraph saying the same thing.
- Put a working first-use route early: required environment, one preferred install or access method, one realistic request or command, and the result the reader can recognize. An installation command alone does not show how to use a skill.
- Match explanation depth to the reader. For people installing their first skill, explain how the skill relates to an agent, the prerequisites, and how to confirm recognition. Manual steps and advanced operations can expand on demand. Use tool-independent wording for a general skill's main path, with import locations following the chosen agent's documentation.
- Expose platform choices only where they change setup. Short alternatives can use a table or a collapsed block; complex setup belongs in a linked guide. Do not invent a universal install command or compatibility with hosts that have not been checked.
- Let project size determine structure. One focused skill may need only a short introduction, setup, an example, and a few links. A collection benefits from a task-to-capability table. A full workflow may need a brief sequence. Do not copy the whole catalog, directory tree, or lifecycle into every README.

## Make capabilities concrete

Show tasks a reader recognizes and the behavior that helps complete them. Prefer a small usable request, actual before/after evidence, or a real screenshot to broad claims about quality or productivity. Label illustrative input as an example; do not fabricate output, benchmark results, endorsements, usage counts, or screenshots.

For visual tools, show a real result when available and useful, with provenance and readable sizing. A text-based workflow can be demonstrated with a short request and expected behavior; it does not need a decorative hero image. Avoid repeating the same feature in an introduction, a bullet list, a table, and a conclusion.

When the user chooses a brand hero, organize its visual elements around the project's name and meaning. Check spelling and legibility at the displayed size. Keep capability and outcome descriptions grounded in the actual project and its evidence. Select cases, screenshots, and detailed engineering rules according to what the homepage needs to explain.

## Separate the general product from optional choices

The default path must work for the intended general audience. Project-specific branding, personal directories, private assets, local model defaults, and opt-in profiles should not dominate its introduction or setup. Put those details in the relevant configuration reference and link them only where they help a reader choose or configure the feature.

Keep implementation routing and full behavior rules in `SKILL.md` and references. Put development checks, architecture internals, changelogs, comparison research, and contribution instructions in appropriate supporting documents. Keep genuine requirements beside the feature they affect: for example, a real browser or two independent models required by a particular review mode.

## Use structure sparingly

Every heading, label, badge, table column, caption, and helper sentence must carry useful information. Keep headings descriptive, paragraphs connected, and lists for genuinely parallel items. A table is useful for choosing among tasks or platforms, not for making ordinary prose look like cards.

Keep necessary conditions, failures, licensing, and compatibility limits, but do not add speculative warnings or defensive sections. Use status badges only when backed by a meaningful live source. Sponsorship, personal biography, star charts, and promotional blocks in a popular project do not make them requirements for another project.

## Localize and verify

- Follow the user's or audience's language and bilingual-format choice. Separate language files need obvious reciprocal links. For same-page translation, follow each Chinese paragraph with its English counterpart, combine headings, and share commands and images where appropriate. Each language must fully explain the purpose, installation, use, and material conditions.
- Translate naturally. Preserve identifiers, paths, commands, constraints, supported features, and strength of claims. In bilingual skill packages, keep one installable language copy active and verify both packages can work without reading their sibling.
- Follow the actual installation flow in a safe temporary location when the route changes. Inspect the rendered GitHub page, including code fences, tables, relative links, image URLs, and collapsed sections. Verify which README GitHub displays by default.
- Read the opening, headings, and final paragraphs together. Remove repeated explanations and maintenance narration. Confirm that the first useful action remains easy to find and that the description still matches the repository.
