# AGENTS.md

- 本仓库按公开独立仓维护，承载通用浏览器自动化能力、公开契约、runtime adapter 边界、独立 Web UI 和服务实现。
- 公开浏览器自动化契约来自本仓 `proto/browser/automation/v1/`；runtime 私有配置、provider raw metadata 和内部执行状态留在本仓 `proto/browser/automation/private/v1/`。
- session/task/artifact 等对外模型以本仓公开 proto 为源头，应用层直接使用生成类型，避免手写重复模型和大面积字段映射。
- 内部业务命令、状态、runtime 配置、artifact 引用、事件和 raw metadata 也优先使用本仓内部 proto 建模；不要只用 Go struct 作为私有契约源头。
- 浏览器 session 必须持久化；调用方通过 session TTL 管理注册流程生命周期，避免长时间占用。
- 本仓不得沉淀 GPT、Outlook 或其他站点注册业务流程；业务流程留在对应业务仓，通过本仓公开契约调用浏览器能力。
- 后端优先使用 Go，按 Clean Code、DI 和面向抽象设计组织代码。
- 引入 Playwright、CDP、浏览器驱动或其他外部 SDK 时必须按官方文档和稳定版本规范开发；无法用 Go 官方稳定 SDK 覆盖的 runtime 可通过明确 adapter/worker 边界隔离。
- `gen/` 承载本仓 proto 生成物；不得手工修改生成物。
- `webui/` 是本仓独立前端；前端模型默认通过本仓 proto 生成 TypeScript 类型，不依赖聚合仓或外部共享 UI 包。
- Linter 检查必须达到 0 error / 0 warning；禁止通过修改或放宽 linter 配置、降低规则级别、删除规则、添加 ignore/disable/nolint/ts-ignore/eslint-disable/biome-ignore/prettier-ignore 等方式绕过问题，只能按 linter 规则修复源码、类型、格式或依赖边界。
- proto 变更后必须运行生成命令、格式化和 Go 检查。
