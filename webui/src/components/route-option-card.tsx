import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

export type RouteOption = {
  cta: string;
  description: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  to: string;
};

type RouteOptionGridProps = {
  ariaLabel: string;
  options: RouteOption[];
};

export function RouteOptionGrid({ ariaLabel, options }: RouteOptionGridProps) {
  return (
    <section className="option-grid" aria-label={ariaLabel}>
      {options.map((option) => <RouteOptionCard key={option.to} option={option} />)}
    </section>
  );
}

function RouteOptionCard({ option }: { option: RouteOption }) {
  const Icon = option.icon;
  return (
    <Link className="card option-card" to={option.to}>
      <div className="route-card-header">
        <span className="route-card-icon"><Icon size={18} /></span>
        <div>
          <p className="section-kicker">{option.kicker}</p>
          <h2>{option.title}</h2>
          <p>{option.description}</p>
        </div>
      </div>
      <span className="option-card-cta">{option.cta}<ArrowRight size={16} /></span>
    </Link>
  );
}
