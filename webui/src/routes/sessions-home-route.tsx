import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Play, Radio } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { paths } from './paths';

export function SessionsHomeRoute() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');

  function openExistingSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId) {
      navigate(paths.sessionLive(normalizedSessionId));
    }
  }

  return (
    <main>
      <PageHeader
        description="入口页只负责开始或接管会话；Live、命令和任务记录进入 session 子路由，不再堆在首页。"
        pending={false}
        title="会话入口"
      />
      <section className="entry-grid" aria-label="Session entry actions">
        <article className="card entry-panel">
          <span className="entry-icon"><Play size={18} /></span>
          <div>
            <p className="section-kicker">Start</p>
            <h2>新建云端浏览器会话</h2>
            <p>只进入会话配置页，启动成功后自动跳转到 /sessions/:sessionId/live。</p>
          </div>
          <Link className="primary link-button" to={paths.newSession}>
            新建会话<ArrowRight size={16} />
          </Link>
        </article>
        <form className="card entry-panel" onSubmit={openExistingSession}>
          <span className="entry-icon"><Radio size={18} /></span>
          <div>
            <p className="section-kicker">Resume</p>
            <h2>接管已有 session</h2>
            <p>输入 session ID 后直接进入实时浏览器页，再通过页内 tabs 切换命令和任务记录。</p>
          </div>
          <label>
            Session ID
            <input
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="browser-session-id"
              value={sessionId}
            />
          </label>
          <button className="secondary" disabled={!sessionId.trim()} type="submit">
            打开 Live 路由<ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}
