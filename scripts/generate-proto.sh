#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PATH="$(go env GOPATH)/bin:$PATH"

rm -rf "$ROOT/gen"
mkdir -p "$ROOT/gen/go"

protoc -I "$ROOT/proto" \
  --go_out="$ROOT" \
  --go_opt=module=github.com/byte-v-forge/browser-automation \
  --go-grpc_out="$ROOT" \
  --go-grpc_opt=module=github.com/byte-v-forge/browser-automation \
  "$ROOT/proto/browser/automation/v1/browser_automation.proto" \
  "$ROOT/proto/browser/automation/private/v1/browser_automation_private.proto"

gofmt -w "$ROOT/gen/go"
