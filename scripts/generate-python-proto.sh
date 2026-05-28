#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${SOURCE_ROOT:-$(cd "${ROOT}/.." && pwd)}"
COMMON_LIB_ROOT="${COMMON_LIB_ROOT:-${SOURCE_ROOT}/common-lib}"
OUT_DIR="${OUT_DIR:-${ROOT}/gen/python}"

OUT_DIR="${OUT_DIR}" "${COMMON_LIB_ROOT}/scripts/generate-python-proto.sh" browserautomation
