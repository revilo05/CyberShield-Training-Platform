import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { AdminDashboard, RiskScore, RouteName, TrainingModule } from '../types';
import { ErrorState, LoadingState, PageHeader, RiskPill } from '../components/Ui';

export function DashboardPage({ navigate }: { navigate: (route: RouteName) => void }) {
  const { user } = useAuth();
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.risk(), api.modules(), ...(user?.role !== 'EMPLOYEE' ? [api.adminDashboard()] : [])])
      .then(([riskData, moduleData, adminData]) => { setRisk(riskData as RiskScore); setModules(moduleData as TrainingModule[]); if (adminData) setAdmin(adminData as AdminDashboard); })
      .catch((reason: Error) => setError(reason.message));
  }, [user?.role]);

  if (error) return <ErrorState message={error} />;
  if (!risk) return <LoadingState />;
  const nextModule = modules.find((module) => module.progress.status !== 'COMPLETED');

  return (
    <>
      <PageHeader eyebrow="Centro de control" title={`Hola, ${user?.fullName.split(' ')[0]}`} description={user?.role === 'EMPLOYEE' ? 'Tu panorama de seguridad está listo. Cada acción reduce el riesgo de toda la organización.' : 'Visibilidad ejecutiva del riesgo humano y el progreso de la organización.'} action={<button className="secondary-button" onClick={() => navigate('simulations')}>Iniciar simulación</button>} />
      <section className="hero-grid">
        <article className="risk-hero">
          <div className="risk-copy"><span>Tu Cyber Risk Score</span><div className="score-line"><strong>{risk.score}</strong><small>/100</small></div><RiskPill level={risk.level} /><p>{risk.recommendations[0]}</p></div>
          <div className={`score-ring ${risk.level.toLowerCase()}`} style={{ '--score': `${risk.score * 3.6}deg` } as React.CSSProperties}><div><strong>{100 - risk.score}%</strong><span>protección</span></div></div>
        </article>
        <article className="next-action-card"><span className="card-kicker">SIGUIENTE ACCIÓN</span><div className="action-icon">▤</div><h2>{nextModule?.title ?? 'Ruta completada'}</h2><p>{nextModule?.description ?? 'Continúa practicando con una simulación realista.'}</p><button className="text-button" onClick={() => navigate(nextModule ? 'modules' : 'simulations')}>{nextModule ? 'Continuar entrenamiento' : 'Practicar ahora'} →</button></article>
      </section>
      <section className="metrics-grid">
        <article className="metric"><span>Módulos completados</span><strong>{risk.factors.completedModules}<small>/{risk.factors.totalModules}</small></strong><div className="mini-progress"><i style={{ width: `${(risk.factors.completedModules / risk.factors.totalModules) * 100}%` }} /></div></article>
        <article className="metric"><span>Amenazas reportadas</span><strong>{risk.factors.reportedThreats}</strong><small className="positive">Conducta defensiva</small></article>
        <article className="metric"><span>Simulaciones fallidas</span><strong>{risk.factors.failedSimulations}</strong><small>{risk.factors.repeatedMistakes} errores repetidos</small></article>
        <article className="metric"><span>Nivel actual</span><RiskPill level={risk.level} /><small>Actualizado ahora</small></article>
      </section>
      {admin && <section className="admin-overview"><div className="section-title"><div><span className="eyebrow">Organización</span><h2>Señales que requieren atención</h2></div><button className="text-button" onClick={() => navigate('reports')}>Ver reporte completo →</button></div><div className="admin-grid"><article><span>Score promedio</span><strong>{admin.averageRiskScore}</strong></article><article><span>Finalización</span><strong>{admin.moduleCompletionPercent}%</strong></article><article><span>Fallos registrados</span><strong>{admin.failedSimulations}</strong></article><article className="wide"><span>Mayor riesgo</span>{admin.highRiskUsers.map((row) => <div className="risk-user" key={row.user.id}><span className="avatar small">{row.user.fullName[0]}</span><div><strong>{row.user.fullName}</strong><small>{row.user.department}</small></div><b>{row.riskScore}</b></div>)}</article></div></section>}
    </>
  );
}
