import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { RiskScore } from '../types';
import { ErrorState, LoadingState, PageHeader, RiskPill } from '../components/Ui';

export function ProfilePage() {
  const { user } = useAuth(); const [risk, setRisk] = useState<RiskScore | null>(null); const [error, setError] = useState('');
  useEffect(() => { api.risk().then(setRisk).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <ErrorState message={error} />; if (!risk || !user) return <LoadingState />;
  const factorRows = [{ label: 'Simulaciones fallidas', value: risk.factors.failedSimulations, tone: 'negative' }, { label: 'Errores repetidos', value: risk.factors.repeatedMistakes, tone: 'warning' }, { label: 'Módulos completados', value: `${risk.factors.completedModules}/${risk.factors.totalModules}`, tone: 'positive' }, { label: 'Amenazas reportadas', value: risk.factors.reportedThreats, tone: 'positive' }];
  return <><PageHeader eyebrow="Perfil de seguridad" title="Mi Cyber Risk Score" description="Una lectura transparente de los comportamientos que aumentan o reducen tu exposición." /><section className="profile-grid"><article className="profile-card"><span className="avatar huge">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><h2>{user.fullName}</h2><p>{user.email}</p><div><span>{user.department}</span><span>{user.role}</span></div></article><article className="score-detail"><div><span>Riesgo actual</span><strong>{risk.score}<small>/100</small></strong><RiskPill level={risk.level} /></div><p>Menor puntuación significa menor exposición. El score se recalcula al completar entrenamientos y simulaciones.</p></article></section><section className="factor-section"><div className="section-title"><div><span className="eyebrow">Factores observados</span><h2>¿Qué compone tu score?</h2></div></div><div className="factor-grid">{factorRows.map((factor) => <article key={factor.label} className={factor.tone}><span>{factor.label}</span><strong>{factor.value}</strong></article>)}</div></section><section className="recommendation-panel"><div><span className="eyebrow">Plan recomendado</span><h2>Próximos pasos para reducir tu riesgo</h2></div><ol>{risk.recommendations.map((recommendation) => <li key={recommendation}><span>✓</span>{recommendation}</li>)}</ol></section></>;
}
