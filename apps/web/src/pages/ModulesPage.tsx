import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { TrainingModule } from '../types';
import { ErrorState, LoadingState, PageHeader } from '../components/Ui';

const categoryLabels: Record<string, string> = { PHISHING: 'Phishing', PASSWORDS: 'Identidad', SOCIAL_ENGINEERING: 'Ingeniería social' };

export function ModulesPage({ openModule }: { openModule: (id: string) => void }) {
  const [modules, setModules] = useState<TrainingModule[]>([]); const [error, setError] = useState('');
  useEffect(() => { api.modules().then(setModules).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <ErrorState message={error} />; if (!modules.length) return <LoadingState />;
  const completed = modules.filter((module) => module.progress.status === 'COMPLETED').length;
  return <><PageHeader eyebrow="Academia CyberShield" title="Ruta de entrenamiento" description="Lecciones breves y prácticas diseñadas según las amenazas que enfrenta tu equipo." />
    <div className="completion-banner"><div><strong>{completed} de {modules.length}</strong><span>módulos completados</span></div><div className="progress-track"><i style={{ width: `${completed / modules.length * 100}%` }} /></div><b>{Math.round(completed / modules.length * 100)}%</b></div>
    <section className="module-grid">{modules.map((module, index) => <article className="module-card" key={module.id}><div className={`module-visual visual-${index}`}><span>{index === 0 ? '⌁' : index === 1 ? '⌾' : '◇'}</span><small>{categoryLabels[module.category]}</small></div><div className="module-body"><div className="module-meta"><span>{module.difficulty === 'BASIC' ? 'Básico' : 'Intermedio'}</span><span>◷ {module.estimatedMinutes} min</span></div><h2>{module.title}</h2><p>{module.description}</p><div className="module-progress"><span>{module.progress.status === 'COMPLETED' ? 'Completado' : module.progress.status === 'IN_PROGRESS' ? `${module.progress.progressPercent}% en progreso` : 'Sin iniciar'}</span><div><i style={{ width: `${module.progress.progressPercent}%` }} /></div></div><button className={module.progress.status === 'NOT_STARTED' ? 'primary-button full' : 'secondary-button full'} onClick={() => openModule(module.id)}>{module.progress.status === 'COMPLETED' ? 'Revisar módulo' : module.progress.status === 'IN_PROGRESS' ? 'Continuar módulo' : 'Comenzar módulo'} →</button></div></article>)}</section>
  </>;
}
