import type { ReactNode } from 'react';
import { CheckCircle2, CircleDot, ListChecks, XCircle } from 'lucide-react';

type SummaryCardProps = {
  failed: number;
  running: number;
  succeeded: number;
  total: number;
};

export function SummaryCard({ failed, running, succeeded, total }: SummaryCardProps) {
  return (
    <section className="summary-grid" aria-label="任务概览">
      <Metric icon={<ListChecks size={18} />} label="任务总数" value={total} tone="info" />
      <Metric icon={<CircleDot size={18} />} label="执行中" value={running} tone="warn" />
      <Metric icon={<CheckCircle2 size={18} />} label="成功" value={succeeded} tone="success" />
      <Metric icon={<XCircle size={18} />} label="失败" value={failed} tone="danger" />
    </section>
  );
}

type MetricProps = {
  icon: ReactNode;
  label: string;
  tone: 'danger' | 'info' | 'success' | 'warn';
  value: number;
};

function Metric({ icon, label, tone, value }: MetricProps) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}
