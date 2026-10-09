import type { ReactNode } from 'react';

export function Card({ title, hint, children, className = '' }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title ? <h2>{title}</h2> : null}
      {hint ? <p className="hint">{hint}</p> : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <section className="card stat">
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      {note ? <div className="note">{note}</div> : null}
    </section>
  );
}
