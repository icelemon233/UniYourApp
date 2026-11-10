# uni-elegant-engineering

[简体中文](README.md) | English

A general application-engineering skill with task-specific guidance for engineering, UI, Web, Windows, verification, and READMEs. It preserves existing stacks and project conventions, with private JSON preferences and a local visual editor.

## Install

Send this in Codex:

```text
Use $skill-installer to install "english version/uni-elegant-engineering" from the icelemon233/uni-elegant-engineering repository.
```

| Language | Skill package |
| --- | --- |
| 中文 | [chinese version](chinese%20version/uni-elegant-engineering/SKILL.md) |
| English | [english version](english%20version/uni-elegant-engineering/SKILL.md) |

You can also copy the selected `uni-elegant-engineering` folder into your agent's skill directory. Install one language only. The guidance corresponds across editions, and configuration tools have one shared source.

## Use

```text
Use $uni-elegant-engineering to fix settings-page alignment and redundant helper text.
Keep the existing theme and check the affected controls in the actual interface.
```

When configuration is needed:

```text
Use $uni-elegant-engineering to initialize this project's preferences and open the configuration editor.
```

Configuration tools use Node.js 24. You can also start the editor directly:

```text
node "<skill-directory>/scripts/config.mjs" ui --project "<project-directory>" --lang en
```

It opens a local browser interface with personal/project layers, palette and typography controls, asset selection, sample-control previews, JSON import/export, and a diff before saving. Changes remain drafts until saved; saves validate and back up the previous file. Sample previews do not replace real-application verification.

Personal defaults live in the operating system's user configuration directory. Project overrides live in `.uni-elegant-engineering/config.local.json` and are excluded from Git by default. Unset preferences follow the project; the current request and explicit project conventions take precedence. The public package contains no personal presets, character artwork, or machine configuration.

## Scope

| Task | Guidance |
| --- | --- |
| Feature development and refactoring | Modules, data, asynchronous behavior, platform boundaries, and tooling |
| Interface implementation and correction | Information hierarchy, controls, responsive layout, focus, and states |
| Windows applications | Native windows, DPI, tray, lifecycle, and installation quality |
| Verification | Risk-appropriate checks and accurate evidence/limitations |
| Repository READMEs | Purpose, first-use paths, concrete examples, and useful documentation links |

**Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.** Preserve information required for actions, labels, conditions, errors, and accessibility.

This skill supplies guidance and configuration rather than orchestrating a complete development process. Independent acceptance, installation, publication, and cleanup follow the actual task and available tools. Missing preference files do not prevent general use.

[Skill entry](english%20version/uni-elegant-engineering/SKILL.md) · [Configuration schema](english%20version/uni-elegant-engineering/config.schema.json) · [README writing](english%20version/uni-elegant-engineering/references/readme.md) · [Maintenance](AGENTS.md)

[MIT License](LICENSE)
