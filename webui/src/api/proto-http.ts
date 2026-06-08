type ProtoRequestOptions = {
  timeoutMessage?: string;
  timeoutMs?: number;
};

type ProtoErrorEnvelope = {
  error?: { message?: string };
};

const defaultTimeoutMs = 30_000;

export async function fetchProto<T>(path: string, options: ProtoRequestOptions = {}): Promise<T> {
  return requestProto<T>(path, { method: 'GET' }, options);
}

export async function postProto<T>(path: string, body: unknown, options: ProtoRequestOptions = {}): Promise<T> {
  return requestProto<T>(
    path,
    {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    },
    options
  );
}

export function ensureProtoSuccess<T extends ProtoErrorEnvelope>(response: T): T {
  if (response.error?.message) {
    throw new Error(response.error.message);
  }
  return response;
}

async function requestProto<T>(path: string, init: RequestInit, options: ProtoRequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs || defaultTimeoutMs);
  try {
    return await readProto<T>(await fetch(path, { ...init, signal: controller.signal }));
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error(options.timeoutMessage || '请求超时，请稍后重试。', { cause });
    }
    throw cause;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function readProto<T>(response: Response): Promise<T> {
  const text = await response.text();
  const parsed = parseBody(text);
  if (!response.ok) {
    throw new Error(errorMessage(parsed) || text || response.statusText);
  }
  return (parsed || {}) as T;
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function errorMessage(value: unknown): string {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return '';
  }
  const envelope = value as ProtoErrorEnvelope;
  return envelope.error?.message || '';
}
