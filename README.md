# browser-automation

Standalone browser automation service with a gRPC API, a JSON/HTTP Web API, persistent sessions/tasks, Playwright-compatible runtime adapters, and an independent React Web UI.

## Current implementation

- Go module: `github.com/byte-v-forge/browser-automation`
- Public proto contract: `proto/browser/automation/v1/browser_automation.proto`
- Internal runtime proto: `proto/browser/automation/private/v1/browser_automation_private.proto`
- Generated Go types: `gen/go/browser/automation/...`
- gRPC adapter: `internal/adapters/grpc`
- HTTP/Web adapter: `internal/adapters/http`
- Service entrypoint: `cmd/browser-automation-service`
- Core application service: `internal/app`
- Domain ports: `internal/core`
- PostgreSQL store: `internal/adapters/repository/postgres`
- Runtime adapters: `internal/adapters/runtime/camoufox`, `internal/adapters/runtime/cloakbrowser`
- Shared Playwright worker script fragments: `internal/adapters/runtime/playwrightworker`
- Independent frontend: `webui`
- Database migration: `migrations/0001_browser_automation_store.sql`

The service supports synchronous command execution through `ExecuteBrowserCommands`: navigation, load waits, selector waits, keyboard input, mouse actions, forms, element extraction, screenshots, file upload, script evaluation, cookies, storage state, and network request inspection.

## Contracts and generation

```sh
sh scripts/generate-proto.sh
OUT_DIR=/tmp/browser-automation-python-proto sh scripts/generate-python-proto.sh
(cd webui && npm run proto)
```

`proto/` is the contract source of truth. Generated Go files are stored in `gen/go`; generated frontend types are produced under `webui/src/proto` during Web UI build/lint.

## Runtime adapters

- `camoufox`: starts a Camoufox remote Firefox server and a persistent Playwright worker per session.
- `cloakbrowser`: starts a CloakBrowser Chromium worker per session.

Runtime is selected by `BROWSER_AUTOMATION_RUNTIME` with values `camoufox` or `cloakbrowser`. `BrowserProfile.browser_kind` must match the runtime: Firefox for Camoufox, Chromium for CloakBrowser.

## Run

```sh
BROWSER_AUTOMATION_POSTGRES_DSN='host=postgres user=browser_automation password=browser_automation dbname=browser_automation port=5432 sslmode=disable' \
BROWSER_AUTOMATION_APPLY_MIGRATIONS=true \
BROWSER_AUTOMATION_RUNTIME=cloakbrowser \
browser-automation-service
```

Common configuration:

- `BROWSER_AUTOMATION_LISTEN_ADDR`: gRPC listen address, default `:50051`.
- `BROWSER_AUTOMATION_HTTP_LISTEN_ADDR`: HTTP/Web listen address, default `:8080`.
- `BROWSER_AUTOMATION_WEB_DIR`: static Web UI directory, default `webui/dist`.
- `BROWSER_AUTOMATION_POSTGRES_DSN`: required session/task PostgreSQL database.
- `BROWSER_AUTOMATION_APPLY_MIGRATIONS`: apply local SQL migrations on startup.
- `BROWSER_AUTOMATION_MIGRATIONS_DIR`: migration directory, default `migrations`.
- `BROWSER_AUTOMATION_RUNTIME`: `camoufox` or `cloakbrowser`.
- `BROWSER_AUTOMATION_ARTIFACTS_DIR`: screenshot and artifact output directory.
- `BROWSER_AUTOMATION_PROXY_REFS_JSON`: proxy reference map, for example `{"register":"socks5://proxy.internal:10813"}`.
- `BROWSER_AUTOMATION_CAMOUFOX_HEADLESS`: Camoufox headless mode.
- `BROWSER_AUTOMATION_CAMOUFOX_TASK_TIMEOUT_SECONDS`: Camoufox default task timeout.
- `BROWSER_AUTOMATION_CLOAK_BROWSER_HEADLESS`: CloakBrowser headless mode.
- `BROWSER_AUTOMATION_CLOAK_BROWSER_HUMANIZE`: CloakBrowser humanization switch.
- `BROWSER_AUTOMATION_CLOAK_BROWSER_TASK_TIMEOUT_SECONDS`: CloakBrowser default task timeout.

## Web UI

```sh
cd webui
npm install
npm run dev
```

The development server proxies `/api` to `http://127.0.0.1:8080`. Production images serve `webui/dist` from the service HTTP port.

## Database

```sh
psql "$BROWSER_AUTOMATION_POSTGRES_DSN" -f migrations/0001_browser_automation_store.sql
```

## Container images

Build the runtime base image first, then the service image:

```sh
docker build -f Dockerfile.runtime -t browser-automation-runtime:camoufox-cloakbrowser-py3.12-bookworm .
docker build -t browser-automation:latest .
```

`Dockerfile` uses only this repository as build context and does not copy sibling repositories.

## Validation commands

```sh
go mod download
go vet ./...
cd webui && npm install && npm run lint
```
