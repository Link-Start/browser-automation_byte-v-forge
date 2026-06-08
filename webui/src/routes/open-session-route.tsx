import type { FormEvent } from 'react';
import { useState } from 'react';
import { ArrowRight, Radio } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageFrame } from '../components/page-frame';
import { PageHeader } from '../components/page-header';
import { paths } from './paths';

export function OpenSessionRoute() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const validationError = validateSessionId(sessionId);
  const showValidationError = Boolean(sessionId) && Boolean(validationError);

  function openExistingSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSessionId = sessionId.trim();
    if (!validationError) {
      navigate(paths.sessionLive(normalizedSessionId));
    }
  }

  return (
    <PageFrame>
      <PageHeader
        description="只处理已有 session 的接管入口，实时画面、命令和任务记录继续走各自子路由。"
        pending={false}
        title="接管已有会话"
      />
      <div className="single-column">
        <form className="card route-card" onSubmit={openExistingSession}>
          <div className="route-card-header">
            <span className="route-card-icon"><Radio size={18} /></span>
            <div>
              <p className="section-kicker">Resume</p>
              <h2>打开指定 session 的实时浏览器</h2>
              <p>输入 session ID 后直接进入 /sessions/:sessionId/live；命令和任务记录通过页内 tabs 切换。</p>
            </div>
          </div>
          <label>
            Session ID
            <input
              autoComplete="off"
              autoFocus
              aria-describedby="session-id-feedback"
              aria-invalid={showValidationError}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="browser-session-id"
              spellCheck={false}
              value={sessionId}
            />
          </label>
          <div className="actions">
            <button className="primary" disabled={Boolean(validationError)} type="submit">
              打开实时浏览器<ArrowRight size={16} />
            </button>
          </div>
          <p id="session-id-feedback" className={showValidationError ? 'form-feedback form-feedback-error' : 'form-feedback'} role={showValidationError ? 'alert' : 'status'} aria-live="polite">
            {showValidationError ? validationError : '输入已有 session ID 后，可按 Enter 或点击按钮进入实时浏览器。'}
          </p>
        </form>
      </div>
    </PageFrame>
  );
}

function validateSessionId(value: string) {
  const sessionId = value.trim();
  if (!sessionId) return '请输入 session ID。';
  if (/\s/.test(sessionId)) return 'Session ID 不能包含空格。';
  if (sessionId.length > 160) return 'Session ID 不能超过 160 个字符。';
  return '';
}
