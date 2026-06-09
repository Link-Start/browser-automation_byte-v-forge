import { Flex } from '@radix-ui/themes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { executeCommands, stopSession } from '../api/browser-api';
import { browserQueryKeys } from '../api/query-keys';
import { safeURL } from '../api/safe-json';
import { useLiveView } from '../hooks/use-live-view';
import { BrowserStage } from './browser-stage';
import { CloudSessionToolbar } from './cloud-session-toolbar';
import { normalizeBrowserUrl, validateBrowserUrl } from '../routes/browser-url';
import { buildSessionBrowserRequest, type SessionBrowserAction } from '../routes/session-browser-actions';

type CloudBrowserPanelProps = {
  onStopped: () => void;
  sessionError?: string;
  sessionId: string;
};

export function CloudBrowserPanel({ onStopped, sessionError, sessionId }: CloudBrowserPanelProps) {
  const queryClient = useQueryClient();
  const liveView = useLiveView(sessionId);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressValue, setAddressValue] = useState('about:blank');
  const currentUrl = liveView.frame?.current_url || 'about:blank';
  const browse = useMutation({ mutationFn: runBrowserAction });
  const stop = useMutation({ mutationFn: () => stopSession(sessionId, 'user stop'), onSuccess: handleStopped });
  const actionError = liveView.error || browse.error?.message || stop.error?.message;
  const disabled = stop.isPending || Boolean(liveView.error);

  useEffect(() => {
    if (!addressFocused) setAddressValue(safeURL(currentUrl));
  }, [addressFocused, currentUrl]);

  async function handleStopped() {
    await queryClient.invalidateQueries({ queryKey: browserQueryKeys.sessions });
    onStopped();
  }

  async function runBrowserAction(action: SessionBrowserAction) {
    const targetUrl = action === 'navigate' ? normalizeBrowserUrl(addressValue) : currentUrl;
    const validationError = action === 'navigate' ? validateBrowserUrl(addressValue) : '';
    if (validationError) throw new Error(validationError);
    return executeCommands(buildSessionBrowserRequest(sessionId, action, targetUrl));
  }

  function mutateAction(action: SessionBrowserAction) {
    if (!disabled) browse.mutate(action);
  }

  return (
    <Flex className="cloud-session-main" direction="column" gap="2">
      <CloudSessionToolbar
        addressValue={addressValue}
        connected={liveView.connected}
        disabled={disabled || browse.isPending}
        error={actionError || sessionError}
        navigating={browse.isPending}
        onAddressChange={setAddressValue}
        onAddressFocusChange={setAddressFocused}
        onBack={() => mutateAction('back')}
        onForward={() => mutateAction('forward')}
        onNavigate={() => mutateAction('navigate')}
        onReload={() => mutateAction('reload')}
        onStop={() => stop.mutate()}
        reconnecting={liveView.reconnecting}
        stopping={stop.isPending}
      />
      <BrowserStage
        connected={liveView.connected}
        error={actionError}
        frame={liveView.frame}
        onInput={liveView.sendInput}
        pending={!liveView.connected && !liveView.error}
      />
    </Flex>
  );
}
