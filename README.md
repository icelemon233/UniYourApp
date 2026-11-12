![UniYourApp](中文版/assets/readme-hero.png)

UniYourApp 是一套给 AI 编程助手（Agent）使用的软件工程技能包，帮助助手按照统一的工程、界面和验证标准开发各类软件项目。

UniYourApp is a software engineering skill for AI coding agents. It helps agents develop software projects with consistent engineering, UI, and verification standards.

## 用途与能力 · What it does

你可以让 Agent 用它创建新项目，也可以为已有项目增加功能、整理代码、调整界面或编写项目说明。Agent 会按任务读取相关规范，沿用项目的技术栈和明确约定。

Use it to create new projects, extend existing ones, refactor code, refine interfaces, or write project documentation. The agent reads the guidance relevant to the task and follows the project's existing stack and conventions.

规范覆盖工程实现、界面交互、改动验证和 README 编写，平台相关要求按任务读取。个人与项目偏好可以复用，让多个项目采用一致的配色、字体和布局约定。

The guidance covers engineering, interface behavior, verification, and README writing, with platform-specific requirements loaded as needed. Reusable personal and project preferences help maintain consistent colors, typography, and layout conventions across projects.

## 开始使用 · Get started

### 1. 准备 Agent · Prepare your agent

准备一个能够读取项目文件的 AI 编程助手。UniYourApp 采用 Agent Skills 格式，安装位置与导入方式由你使用的工具决定。

Use an AI coding agent that can read project files. UniYourApp follows the Agent Skills format. Your tool determines where skills are installed and how they are imported.

### 2. 安装技能 · Install the skill

将下面的安装请求发给 Agent，选择你希望使用的语言版本。中文版和英文版各自包含完整技能，安装其中一版即可。

Send your agent the installation request for your preferred language. Each edition contains the complete skill, so choose one.

```text
请从 GitHub 仓库 icelemon233/UniYourApp
安装“中文版”目录中的 Skill，名称设为 uni-your-app。
保留该版本的全部文件，确认实际安装位置，
并检查能否读取技能及其引用的规范。
```

```text
Install the Skill from this GitHub repository
icelemon233/UniYourApp
Use the English_Version directory and name it uni-your-app.
Retain the entire edition, confirm its installation path,
and check that you can read the skill and its guidance.
```

<details>
<summary>手动安装 · Manual installation</summary>

1. 在仓库页面选择 **Code → Download ZIP**，下载后解压。

   On the repository page, select **Code → Download ZIP**, then extract the archive.

2. 选择 `中文版` 或 `English_Version`，将选中的文件夹重命名为 `uni-your-app`。保留文件夹内的全部内容，入口位于 `uni-your-app/SKILL.md`。

   Choose `中文版` or `English_Version` and rename the selected folder to `uni-your-app`. Keep everything inside it. The entry point is `uni-your-app/SKILL.md`.

3. 按所用 Agent 的说明，导入整个文件夹，或将它放入工具的技能目录。

   Follow your agent's instructions to import the whole folder or place it in the tool's skills directory.

4. 按工具要求刷新技能或打开新会话，确认 `uni-your-app` 已被识别。使用直接读取文件的 Agent 时，在对话中指定 `SKILL.md` 的实际位置，请它读取入口及相关引用文件。

   Refresh skills or start a new session as required by your tool, then confirm that `uni-your-app` is recognized. With an agent that reads files directly, give it the actual path to `SKILL.md` and ask it to read the entry point and relevant referenced files.

</details>

### 3. 提出需求 · Start using it

在项目中说明你想做的软件、主要功能和运行平台，并请 Agent 使用 UniYourApp。可以把下面方括号中的内容换成自己的需求。

Describe the software you want to build, its main features, and where it should run. Ask your agent to use UniYourApp. Replace the bracketed text below with your requirements.

```text
请使用 UniYourApp 开发这个项目。
我想做的软件是［用途、主要功能和运行平台］。
请遵循项目的技术栈与约定，并检查本次改动的实际结果。
```

```text
Use UniYourApp to develop this project.
I want to build [purpose, main features, and target platforms].
Follow the project's stack and conventions,
and check the actual behavior affected by the changes.
```

已有项目可以直接说明需要修改的功能。完成后，查看 Agent 提供的改动说明和验证结果。

For an existing project, describe the change you need. Review the agent's explanation of the changes and its verification results when the work is complete.

## 偏好配置 · Preferences

需要自定义配色、字体、布局或素材时，可以使用本地可视化配置器。它支持个人默认与项目覆盖、样例预览、JSON 导入导出和保存前差异检查。配置保存在本机，保存时会备份旧文件。

Use the local visual editor to customize colors, typography, layout, or assets. It supports personal defaults and project overrides, sample previews, JSON import/export, and a diff before saving. Configuration stays on your machine, and saves retain a backup of the previous file.

这个可选工具需要 Node.js 24。将下面的请求发给 Agent，可以初始化当前项目的偏好并打开编辑器。

This optional tool requires Node.js 24. Send the following request to initialize preferences for the current project and open the editor.

```text
请为当前项目初始化 UniYourApp 偏好，
参考项目现有的设计设置，并打开本地配置界面供我调整。
```

```text
Initialize UniYourApp preferences for the current project.
Use its existing design settings and open the local editor.
```

<details>
<summary>直接启动配置器 · Start the editor manually</summary>

将命令中的路径替换为实际的技能安装目录和项目目录，然后运行。

Replace the paths with the actual skill installation directory and project directory, then run the command.

```sh
node "<skill-directory>/scripts/config.mjs" ui --project "<project-directory>"
```

个人默认保存在系统用户配置目录下的 `uni-your-app`，项目覆盖保存在 `.uni-your-app/config.local.json`。工具会在写入项目配置前确认 Git 排除生效，项目明确约定优先于偏好设置。

Personal defaults live in `uni-your-app` under the operating system's user configuration directory. Project overrides live in `.uni-your-app/config.local.json`. The tool verifies effective Git exclusion before writing project configuration. Explicit project conventions take precedence over preferences.

</details>

## 深入阅读 · Further reading

完整规范可以从所选语言版本的技能入口继续阅读。配置字段由 JSON Schema 定义。

Open the skill entry in your preferred language to explore the full guidance. Configuration fields are defined by the JSON Schema.

- [中文版规范](中文版/SKILL.md) · [English guide](English_Version/SKILL.md)
- [配置格式 · Configuration schema](中文版/config.schema.json)
- [README 写作方法](中文版/references/readme.md) · [README writing guide](English_Version/references/readme.md)
- [Agent Skills 标准 · Specification](https://agentskills.io/specification)
- [MIT 许可证 · License](中文版/LICENSE)
