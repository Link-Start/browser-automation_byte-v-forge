import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { BrowserKind, type BrowserCommand, type BrowserTask } from './proto/browser/automation/v1/browser_automation';
import { executeCommands, listTasks, startSession, stopSession } from './api/browser-api';
import { defaultCommands, formatJSON } from './api/defaults';
import { CommandCard } from './components/command-card';
import { ResultCard } from './components/result-card';
import { SessionCard } from './components/session-card';
import { Status } from './components/status';
import { TaskList } from './components/task-list';

export function App() {
  const [browserKind, setBrowserKind] = useState<BrowserKind>(BrowserKind.BROWSER_KIND_CHROMIUM);
  const [commandsText, setCommandsText] = useState(formatJSON(defaultCommands));
  const [lastTask, setLastTask] = useState<BrowserTask>();
  const [locale, setLocale] = useState('en-US');
  const [proxyRef, setProxyRef] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const tasks = useQuery({ queryKey: ['tasks', sessionId], queryFn: () => listTasks(sessionId), enabled: true });
  const start = useMutation({ mutationFn: handleStart, onSuccess: (response) => setSessionId(response.session?.session_id || '') });
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'webui stop'), onSuccess: () => setSessionId('') });
  const execute = useMutation({ mutationFn: handleExecute, onSuccess: (response) => setLastTask(response.task) });
  const error = start.error?.message || stop.error?.message || execute.error?.message || tasks.error?.message;
  const pending = start.isPending || stop.isPending || execute.isPending;
  const taskItems = useMemo(() => tasks.data?.tasks || [], [tasks.data?.tasks]);

  async function handleStart() {
    return startSession({
      profile: {
        browser_kind: browserKind,
        locale,
        timezone,
        proxy_ref: proxyRef,
        user_agent: '',
        viewport: undefined,
        storage_state_secret_ref: undefined,
        extra_http_headers: {},
        init_scripts: []
      },
      request_id: '',
      ttl: '1800s',
      security_policy: undefined,
      labels: { source: 'standalone-webui' }
    });
  }

  async function handleExecute() {
    const commands = JSON.parse(commandsText) as BrowserCommand[];
    const response = await executeCommands({
      request_id: '',
      input: {
        session_id: sessionId,
        task_key: 'webui.commands',
        scenario_key: '',
        target_url: '',
        timeout: undefined,
        commands,
        security_policy: undefined,
        labels: {}
      }
    });
    await tasks.refetch();
    return response;
  }

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">Standalone service</p>
          <h1>Browser Automation</h1>
        </div>
        <Status error={error} message={pending ? 'Request running…' : undefined} />
      </header>
      <div className="layout">
        <SessionCard
          browserKind={browserKind}
          headlessNote="Runtime is selected by service config"
          locale={locale}
          onBrowserKindChange={setBrowserKind}
          onLocaleChange={setLocale}
          onProxyRefChange={setProxyRef}
          onStart={() => start.mutate()}
          onStop={() => stop.mutate()}
          onTimezoneChange={setTimezone}
          pending={pending}
          proxyRef={proxyRef}
          sessionId={sessionId}
          timezone={timezone}
        />
        <CommandCard commandsText={commandsText} onChange={setCommandsText} onExecute={() => execute.mutate()} pending={pending} sessionId={sessionId} />
        <ResultCard task={lastTask} />
        <TaskList tasks={taskItems} />
      </div>
    </main>
  );
}
