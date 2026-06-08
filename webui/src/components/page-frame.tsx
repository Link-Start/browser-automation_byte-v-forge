import type { AriaRole, ReactNode } from 'react';

type PageFrameProps = {
  children: ReactNode;
  className?: string;
  role?: AriaRole;
};

export function PageFrame({ children, className, role }: PageFrameProps) {
  return (
    <main className={className} id="main-content" role={role} tabIndex={-1}>
      {children}
    </main>
  );
}
