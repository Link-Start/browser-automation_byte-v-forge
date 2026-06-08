#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUT_DIR:-${ROOT}/gen/python}"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

protoc -I "${ROOT}/proto" \
  --python_out="${OUT_DIR}" \
  --pyi_out="${OUT_DIR}" \
  "${ROOT}/proto/browser/automation/v1/browser_automation.proto" \
  "${ROOT}/proto/browser/automation/private/v1/browser_automation_private.proto"
