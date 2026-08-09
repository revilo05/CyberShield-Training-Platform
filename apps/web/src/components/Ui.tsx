import type { ReactNode } from 'react';
import type { RiskLevel } from '../types';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function RiskPill({ level }: { level: RiskLevel }) {
  const labels = { LOW: 'Riesgo bajo', MEDIUM: 'Riesgo medio', HIGH: 'Riesgo alto' };
  return <span className={`risk-pill ${level.toLowerCase()}`}><span />{labels[level]}</span>;
}

export function LoadingState() { return <div className="loading-state"><span className="spinner" /><p>Analizando datos de seguridad…</p></div>; }
export function ErrorState({ message }: { message: string }) { return <div className="notice error"><strong>No pudimos cargar esta vista</strong><p>{message}</p></div>; }
