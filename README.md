# uni-elegant-engineering

简体中文 | [English](README.en.md)

通用应用工程技能，按任务提供工程、UI、Web、Windows、验证和 README 规范。保留项目已有的技术栈与设计约定，支持私有 JSON 偏好和本地可视化配置。

## 安装

在 Codex 中发送：

```text
使用 $skill-installer 安装 icelemon233/uni-elegant-engineering 仓库中的 "chinese version/uni-elegant-engineering"。
```

| 语言 | 技能包 |
| --- | --- |
| 中文 | [chinese version](chinese%20version/uni-elegant-engineering/SKILL.md) |
| English | [english version](english%20version/uni-elegant-engineering/SKILL.md) |

也可以把所选 `uni-elegant-engineering` 文件夹复制到代理的技能目录。只安装其中一版；两版规则对应，配置工具共用一份源码。

## 使用

```text
使用 $uni-elegant-engineering 修复设置页的对齐和重复说明，
沿用现有主题，并检查受影响控件的实际表现。
```

需要配置时：

```text
使用 $uni-elegant-engineering 初始化当前项目的偏好，并打开配置界面。
```

配置工具使用 Node.js 24，也可直接启动：

```text
node "<技能目录>/scripts/config.mjs" ui --project "<项目目录>" --lang zh
```

它在本机打开浏览器，提供个人／项目切换、配色与字体编辑、素材选择、控件样例预览、JSON 导入导出和保存前差异检查。修改先进入草稿，保存会校验并备份旧文件。样例预览不代替实际应用验收。

个人默认保存在系统用户配置目录，项目覆盖保存在 `.uni-elegant-engineering/config.local.json`，默认从 Git 排除。未设置的选项沿用项目；当前任务与项目明确约定优先。公开包不带个人预设、人物素材或本机配置。

## 范围

| 任务 | 规范 |
| --- | --- |
| 功能开发与重构 | 模块、数据、异步行为、平台边界和工程工具 |
| 界面实现与修复 | 信息层级、控件、响应式、焦点和交互状态 |
| Windows 应用 | 原生窗口、DPI、托盘、生命周期和安装质量 |
| 验证改动 | 按风险选择检查，区分真实证据与未验证项 |
| 项目 README | 用途、首次使用路径、具体示例和必要文档入口 |

**避免不必要的次要标签和描述，让布局本身来传达信息。** 保留操作、标签、条件、错误和无障碍所需的信息。

本技能提供规范与配置，不编排完整开发流程。独立验收、安装、发布和清理按具体任务与环境提供的工具执行。没有偏好文件也能按通用规则工作。

[完整入口](chinese%20version/uni-elegant-engineering/SKILL.md) · [配置格式](chinese%20version/uni-elegant-engineering/config.schema.json) · [README 方法](chinese%20version/uni-elegant-engineering/references/readme.md) · [维护约定](AGENTS.md)

[MIT 许可证](LICENSE)
