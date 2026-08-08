import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { User } from '../types';

export function LoginPage() {
  const { login } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('empleado@cybershield.demo');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.demoUsers().then(setUsers).catch((reason: Error) => setError(reason.message)); }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError('');
    try { await login(email); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.'); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-mark large">C</span><span><strong>CyberShield</strong><small>Training Platform</small></span></div>
        <div className="story-copy"><span className="eyebrow">Human Risk Intelligence</span><h1>Convierte a tu equipo en la primera línea de defensa.</h1><p>Entrenamiento medible, simulaciones realistas y señales de riesgo accionables en un solo lugar.</p></div>
        <div className="trust-row"><span>✓ Aprendizaje continuo</span><span>✓ Riesgo cuantificable</span><span>✓ Respuesta temprana</span></div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="secure-label">● ENTORNO DEMO SEGURO</span><h2>Bienvenido de nuevo</h2><p>Selecciona un perfil para explorar la experiencia según su rol.</p>
          <label>Perfil de acceso<select value={email} onChange={(event) => setEmail(event.target.value)}>
            {users.map((user) => <option value={user.email} key={user.id}>{user.fullName} — {user.role}</option>)}
          </select></label>
          <button className="primary-button full" disabled={submitting || users.length === 0}>{submitting ? 'Verificando…' : 'Acceder al centro de riesgo'}<span>→</span></button>
          {error && <div className="inline-error">{error}</div>}
          <div className="demo-hint"><strong>Usuarios demo</strong><span>Empleado, supervisor y administrador disponibles sin contraseña.</span></div>
        </form>
      </section>
    </main>
  );
}
