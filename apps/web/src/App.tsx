const stats = [
  { label: 'Cyber Risk Score promedio', value: '42/100' },
  { label: 'Módulos completados', value: '68%' },
  { label: 'Simulaciones fallidas', value: '7' },
  { label: 'Amenazas reportadas', value: '15' }
];

const modules = [
  'Detectar correos de phishing',
  'Contraseñas seguras y MFA',
  'Ingeniería social en el trabajo'
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">CyberShield Training Platform</p>
          <h1>Entrenamiento y medición del riesgo humano en ciberseguridad</h1>
          <p>
            Plataforma SaaS para simular amenazas reales, personalizar rutas de aprendizaje y medir el Cyber Risk Score por empleado, departamento y empresa.
          </p>
          <button>Ver dashboard demo</button>
        </div>
        <aside className="score-card">
          <span>Cyber Risk Score</span>
          <strong>42</strong>
          <p>Riesgo medio · Requiere refuerzo en phishing</p>
        </aside>
      </section>

      <section className="grid">
        {stats.map((stat) => (
          <article className="metric-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Ruta recomendada</h2>
        <ul>
          {modules.map((module) => (
            <li key={module}>{module}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
