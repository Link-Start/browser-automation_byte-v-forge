# browser-automation

`browser-automation` 是可独立部署的浏览器自动化服务，为注册、登录、OAuth、页面探测等需要真实浏览器的流程提供统一执行能力。

## 核心能力

- 提供 gRPC 与 HTTP API，支持会话创建、页面操作、表单输入、元素读取、截图、Cookie/Storage 和网络信息采集。
- 持久化 session、task 与 artifact，调用方可用 TTL 管理浏览器流程生命周期。
- 通过 runtime adapter 隔离 Camoufox、CloakBrowser、Playwright/CDP 等浏览器实现细节。
- 自带独立 Web UI，用于查看会话、任务、执行结果和调试材料。
- 只提供通用浏览器能力，不内置 GPT、邮箱或其他业务注册流程。

## 使用方式

业务服务通过公开 proto/gRPC 或 HTTP 边界调用浏览器能力；业务状态机、站点规则和账号流程留在各业务仓。运行时、代理引用、artifact 存储和数据库连接由部署配置注入。

## 入口

- 服务入口：`cmd/browser-automation-service`
- 契约真源：`proto/browser/automation/v1/`
- 内部 runtime 契约：`proto/browser/automation/private/v1/`
- 独立前端：`webui/`

## 常用检查

```sh
sh scripts/generate-proto.sh
(cd webui && npm run proto)
git diff --check
```
