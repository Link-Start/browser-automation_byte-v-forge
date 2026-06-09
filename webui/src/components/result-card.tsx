import { Badge, Box, Button, Card, Text } from '@radix-ui/themes';
import { Rows3, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import type { BrowserTask } from '../proto/browser/automation/v1/browser_automation';
import { statusLabel, statusThemeColor } from '../api/defaults';
import { safeJSONStringify, safeMessage, safeTextPreview, safeURL } from '../api/safe-json';
import { EmptyState } from './empty-state';

type ResultCardProps = {
  task?: BrowserTask;
  taskHistoryPath?: string;
};

export function ResultCard({ task, taskHistoryPath }: ResultCardProps) {
  const firstResult = task?.results?.[0];
  const pageLabel = task ? resultPageLabel(task) : '-';
  return (
    <Card className="card result-card">
      <div className="card-title">
        <Box>
          <p className="section-kicker">Step 03</p>
          <Text as="p" size="5" weight="bold">最近结果</Text>
        </Box>
        <Badge color={task ? statusThemeColor(task.status) : 'gray'} variant="soft">{task ? statusLabel(task.status) : '空闲'}</Badge>
      </div>
      {task ? (
        <div className="result-body">
          <div className="result-line"><span>任务 ID</span><strong title={task.task_id}>{task.task_id}</strong></div>
          <div className="result-line"><span>页面</span><strong title={pageLabel}>{pageLabel}</strong></div>
          {task.last_error?.message ? <p className="error-box">{safeMessage(task.last_error.message)}</p> : null}
          {firstResult?.text ? <pre className="text-preview">{safeTextPreview(firstResult.text)}</pre> : null}
          <details className="json-editor">
            <summary>JSON</summary>
            <pre>{safeJSONStringify(task)}</pre>
          </details>
          {taskHistoryPath ? <Button asChild size="2" variant="soft"><Link to={taskHistoryPath}><Rows3 size={14} />查看任务记录</Link></Button> : null}
        </div>
      ) : (
        <EmptyState
          action={taskHistoryPath ? <Button asChild size="2" variant="soft"><Link to={taskHistoryPath}><Rows3 size={14} />查看任务记录</Link></Button> : undefined}
          description="暂无结果"
          icon={<Sparkles size={22} />}
          title="等待最近结果"
        />
      )}
    </Card>
  );
}

function resultPageLabel(task: BrowserTask) {
  const firstResult = task.results?.[0];
  if (firstResult?.title) {
    return safeMessage(firstResult.title);
  }
  const url = firstResult?.current_url || task.input?.target_url || '';
  return url ? safeURL(url) : '-';
}
