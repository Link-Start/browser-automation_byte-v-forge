#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTO_DIR="${BROWSER_AUTOMATION_PROTO_DIR:-${ROOT}/../proto}"
OUT_DIR="${OUT_DIR:-${ROOT}/src/proto}"
LOCAL_PLUGIN="${ROOT}/node_modules/.bin/protoc-gen-ts_proto"
PLUGIN="${PROTOC_GEN_TS_PROTO:-}"

if [[ -z "${PLUGIN}" && -x "${LOCAL_PLUGIN}" ]]; then
  PLUGIN="${LOCAL_PLUGIN}"
fi

if [[ -z "${PLUGIN}" || ! -x "${PLUGIN}" ]]; then
  printf 'ts-proto plugin not found; run npm install in webui first\n' >&2
  exit 1
fi

PUBLIC_PROTO="${PROTO_DIR}/browser/automation/v1/browser_automation.proto"
if [[ ! -f "${PUBLIC_PROTO}" ]]; then
  printf 'browser automation proto not found under: %s\n' "${PROTO_DIR}" >&2
  exit 1
fi

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

PROTO_INCLUDES=("-I" "${PROTO_DIR}")
if [[ -d /usr/include/google/protobuf ]]; then
  PROTO_INCLUDES+=("-I" "/usr/include")
fi

protoc "${PROTO_INCLUDES[@]}" \
  --plugin="protoc-gen-ts_proto=${PLUGIN}" \
  --ts_proto_out="${OUT_DIR}" \
  --ts_proto_opt=onlyTypes=true,outputServices=none,esModuleInterop=true,useJsonWireFormat=true,snakeToCamel=false,stringEnums=true \
  "${PUBLIC_PROTO}"
