# uni-elegant-engineering

[中文](#中文版) | [English](#english)

## 中文版

通用应用工程技能，按任务提供工程、UI、Web、Windows、验证和 README 规范，并支持私有 JSON 偏好与本地可视化配置。

### 安装

在 Codex 中发送以下请求，将选中的版本安装为 `uni-elegant-engineering`。

```text
使用 $skill-installer 从 icelemon233/uni-elegant-engineering 仓库的“中文版”目录安装技能，安装名称指定为 uni-elegant-engineering。
```

手动安装时，将选定版本的文件夹命名为 `uni-elegant-engineering`，放入代理的技能目录。

| 版本 | 技能入口 |
| --- | --- |
| 中文版 | [SKILL.md](中文版/SKILL.md) |
| English_Version | [SKILL.md](English_Version/SKILL.md) |

### 使用

```text
使用 $uni-elegant-engineering 修复设置页的对齐和重复说明，
沿用现有主题，并检查受影响控件的实际表现。
```

需要设置偏好时，可以让 Codex 初始化当前项目的配置并打开编辑器。配置工具使用 Node.js 24，也可从已安装的技能目录启动。

```text
node "<技能目录>/scripts/config.mjs" ui --project "<项目目录>" --lang zh
```

本地编辑器支持个人／项目切换、配色与字体编辑、素材选择、控件样例预览、JSON 导入导出和保存前差异检查。修改先进入草稿，保存时校验并备份旧文件。实际应用效果按项目要求验证。

个人默认位于系统用户配置目录，项目覆盖位于 `.uni-elegant-engineering/config.local.json`，写入前确认 Git 实际排除。当前任务要求与项目明确约定优先，未设置的选项沿用项目。

### 范围

工程规范覆盖模块、数据、异步行为与平台边界。界面规范覆盖信息层级、控件、响应式、焦点和状态。验证根据改动风险选择检查，README 规范帮助组织用途、安装、示例和文档入口。

**避免不必要的次要标签和描述，让布局本身来传达信息。** 保留操作、标签、条件、错误和无障碍所需的信息。

[配置格式](中文版/config.schema.json) · [README 方法](中文版/references/readme.md) · [维护约定](中文版/AGENTS.md) · [MIT 许可证](中文版/LICENSE)

## English

A general application-engineering skill with task-specific guidance for engineering, UI, Web, Windows, verification, and READMEs. It supports private JSON preferences and a local visual editor.

### Install

Send this request in Codex to install the English edition under the name `uni-elegant-engineering`.

```text
Use $skill-installer to install the English_Version directory from icelemon233/uni-elegant-engineering. Set the installed skill name to uni-elegant-engineering.
```

For manual installation, name the selected edition folder `uni-elegant-engineering` and place it in your agent's skill directory. Choose one edition.

### Use

```text
Use $uni-elegant-engineering to fix settings-page alignment and redundant helper text.
Keep the existing theme and check the affected controls in the actual interface.
```

Ask Codex to initialize the current project's preferences and open the editor when configuration is needed. Configuration tools use Node.js 24 and can also be started from the installed skill directory.

```text
node "<skill-directory>/scripts/config.mjs" ui --project "<project-directory>" --lang en
```

The local editor supports personal/project layers, palette and typography controls, asset selection, sample-control previews, JSON import/export, and a diff before saving. Edits remain drafts until saved. Saves validate and retain a backup. Verify the actual application according to its project requirements.

Personal defaults live in the operating system's user configuration directory. Project overrides live in `.uni-elegant-engineering/config.local.json`, with effective Git exclusion verified before writing. The current request and explicit project conventions take precedence. Unset preferences follow the project.

### Scope

Engineering guidance covers modules, data, asynchronous behavior, and platform boundaries. Interface guidance covers hierarchy, controls, responsive layout, focus, and states. Verification follows the change's risk. README guidance organizes purpose, setup, examples, and documentation entry points.

**Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.** Preserve information needed for actions, labels, conditions, errors, and accessibility.

[Skill entry](English_Version/SKILL.md) · [Configuration schema](English_Version/config.schema.json) · [README writing](English_Version/references/readme.md) · [Maintenance](English_Version/AGENTS.md) · [MIT License](English_Version/LICENSE)
