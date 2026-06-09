import type {
  ExecuteBrowserCommandsRequest,
  CreateBrowserLiveViewResponse,
  ExecuteBrowserCommandsResponse,
  ListBrowserSessionsResponse,
  ListBrowserTasksResponse,
  StartBrowserSessionRequest,
  StartBrowserSessionResponse,
  StopBrowserSessionResponse
} from '../proto/browser/automation/v1/browser_automation';
import { ensureProtoSuccess, fetchProto, postProto } from './proto-http';

const basePath = '/api/browser-automation';

export async function startSession(request: StartBrowserSessionRequest): Promise<StartBrowserSessionResponse> {
  return ensureProtoSuccess(await postProto<StartBrowserSessionResponse>(`${basePath}/sessions`, request, {
    timeoutMessage: '启动浏览器会话超时，请稍后重试或降低并发。',
    timeoutMs: 150_000
  }));
}

export async function listSessions(): Promise<ListBrowserSessionsResponse> {
  const query = new URLSearchParams({ page_size: '50' });
  return ensureProtoSuccess(await fetchProto<ListBrowserSessionsResponse>(`${basePath}/sessions?${query.toString()}`, {
    timeoutMessage: '加载会话列表超时，请稍后重试。',
    timeoutMs: 20_000
  }));
}

export async function createLiveView(sessionId: string): Promise<CreateBrowserLiveViewResponse> {
  return ensureProtoSuccess(await postProto<CreateBrowserLiveViewResponse>(
    `${basePath}/sessions/${encodeURIComponent(sessionId)}/live`,
    {
      session_id: sessionId,
      control_enabled: true,
      max_width: 1280,
      max_height: 900
    },
    {
      timeoutMessage: '创建 LiveView 超时，请确认会话仍在运行。',
      timeoutMs: 30_000
    }
  ));
}

export function liveViewWebSocketPath(token: string) {
  return `/ws/browser-automation/live/${encodeURIComponent(token)}`;
}

export async function stopSession(sessionId: string, reason: string): Promise<StopBrowserSessionResponse> {
  return ensureProtoSuccess(await postProto<StopBrowserSessionResponse>(
    `${basePath}/sessions/${encodeURIComponent(sessionId)}/stop`,
    {
      session_id: sessionId,
      reason
    },
    {
      timeoutMessage: '停止会话超时，请稍后刷新状态。',
      timeoutMs: 20_000
    }
  ));
}

export async function executeCommands(request: ExecuteBrowserCommandsRequest): Promise<ExecuteBrowserCommandsResponse> {
  return ensureProtoSuccess(await postProto<ExecuteBrowserCommandsResponse>(`${basePath}/tasks/execute`, request, {
    timeoutMessage: '命令执行超时，请到任务记录页查看最终状态。',
    timeoutMs: 120_000
  }));
}

export async function listTasks(sessionId: string): Promise<ListBrowserTasksResponse> {
  const query = new URLSearchParams({ page_size: '25' });
  if (sessionId.trim()) {
    query.set('session_id', sessionId.trim());
  }
  return ensureProtoSuccess(await fetchProto<ListBrowserTasksResponse>(`${basePath}/tasks?${query.toString()}`, {
    timeoutMessage: '加载任务记录超时，请稍后重试。',
    timeoutMs: 20_000
  }));
}
