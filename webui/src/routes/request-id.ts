export function newRequestId(scope: string) {
  return `${scope}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`;
}
