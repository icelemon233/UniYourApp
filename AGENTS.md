# 仓库维护

本仓库发布同一个通用技能的完整中英文版本，位于 `chinese version/uni-elegant-engineering/` 与 `english version/uni-elegant-engineering/`。每次只安装其中一版，根目录没有第三个技能入口。

- `README.md` 默认中文，`README.en.md` 为完整英文入口，保持功能、条件与命令一致。
- 规范限于工程、UI、Web、Windows、验证和 README 六类。质量要求不能变成可关闭的偏好；独立验收编排不属于本仓库。
- 不发布个人品牌、人物设定、固定私有参数、素材、本机配置、调研记录、运行日志或备份。用户值位于系统用户配置目录或 Git 排除的项目配置目录。
- 共享配置协议与运行工具只编辑 `shared/`，再运行 `node scripts/sync-packages.mjs` 同步到两个独立包。包内不依赖兄弟目录或仓库根目录。
- 中英文规范同步维护行为与权限边界。配置结构与校验共用，界面通过语言切换本地化；不要复制两套界面实现。
- 避免不必要的次要标签和描述，让布局本身来传达信息。
- 修改后运行 `node scripts/validate.mjs` 及 `node --test scripts/config.test.mjs scripts/validate.test.mjs`。界面变更还需实际浏览器检查，包括受影响输入、草稿、继承、保存和窄屏。
- 测试使用隔离的 `work/` 和 `--user-dir`，不能写日常个人配置。发布前检查暂存内容及实际远端结果，保留用户已有工作。
