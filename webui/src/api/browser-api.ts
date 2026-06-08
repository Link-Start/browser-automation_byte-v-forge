import type {
  ExecuteBrowserCommandsRequest,
  CreateBrowserLiveViewResponse,
  ExecuteBrowserCommandsResponse,
  ListBrowserTasksResponse,
  StartBrowserSessionRequest,
  StartBrowserSessionResponse,
  StopBrowserSessionResponse
} from '../proto/browser/automation/v1/browser_automation';

const basePath = '/api/browser-automation';

export async function startSession(request: StartBrowserSessionRequest): Promise<StartBrowserSessionResponse> {
  return ensureSuccess(await postProto<StartBrowserSessionResponse>(`${basePath}/sessions`, request));
}

export async function createLiveView(sessionId: string): Promise<CreateBrowserLiveViewResponse> {
  return ensureSuccess(await postProto<CreateBrowserLiveViewResponse>(`${basePath}/sessions/${encodeURIComponent(sessionId)}/live`, {
    session_id: sessionId,
    control_enabled: true,
    max_width: 1280,
    max_height: 900
  }));
}

export function liveViewWebSocketPath(token: string) {
  return `/ws/browser-automation/live/${encodeURIComponent(token)}`;
}

export async function stopSession(sessionId: string, reason: string): Promise<StopBrowserSessionResponse> {
  return ensureSuccess(await postProto<StopBrowserSessionResponse>(`${basePath}/sessions/${encodeURIComponent(sessionId)}/stop`, {
    session_id: sessionId,
    reason
  }));
}

export async function executeCommands(request: ExecuteBrowserCommandsRequest): Promise<ExecuteBrowserCommandsResponse> {
  return ensureSuccess(await postProto<ExecuteBrowserCommandsResponse>(`${basePath}/tasks/execute`, request));
}

export async function listTasks(sessionId: string): Promise<ListBrowserTasksResponse> {
  const query = new URLSearchParams({ page_size: '25' });
  if (sessionId.trim()) {
    query.set('session_id', sessionId.trim());
  }
  return ensureSuccess(await fetchProto<ListBrowserTasksResponse>(`${basePath}/tasks?${query.toString()}`));
}

async function postProto<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return readProto<T>(response);
}

async function fetchProto<T>(path: string): Promise<T> {
  return readProto<T>(await fetch(path));
}

async function readProto<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function ensureSuccess<T extends { error?: { message?: string } }>(response: T): T {
  if (response.error?.message) {
    throw new Error(response.error.message);
  }
  return response;
}
