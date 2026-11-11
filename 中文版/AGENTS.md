# 版本维护

本目录是完整中文版技能包。仓库根目录包含“中文版”、`English_Version` 和双语 `README.md`。安装时使用名称 `uni-elegant-engineering`。

- 规范按工程、共用 UI、Web、Windows、验证和 README 六类维护，中英文行为与权限边界保持对应。
- 配置与运行工具在两版中各自完整。修改当前版本的通用工具后，运行 `node scripts/sync-versions.mjs` 同步另一版，分别维护自然语言规范和界面元数据。
- 公开内容包含通用规范、配置协议、编辑器与必要维护工具。个人偏好、品牌素材、调研和运行资料保存在用户目录或被排除的工作目录。
- 避免不必要的次要标签和描述，让布局本身来传达信息。
- 从本目录运行 `node scripts/validate.mjs` 及 `node --test scripts/config.test.mjs scripts/validate.test.mjs`。完整双语检出同时检查两版，独立安装检查当前包。
- 测试使用本目录的 `work/` 和隔离 `--user-dir`。界面变更检查实际输入、草稿、继承、保存和相关视口。
- 本目录的 `.github/workflows/validate.yml` 用于将本版作为独立仓库时的自动检查。双语仓库通过上述版本内命令验证。
- 仓库首页在单个 `README.md` 中提供完整中文与英文内容，使用锚点导航。修改后检查链接、安装名称、配置路径与实际 GitHub 展示。
