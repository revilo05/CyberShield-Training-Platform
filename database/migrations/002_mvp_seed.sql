-- Extensiones y datos demostrativos del MVP. Es idempotente para facilitar Docker Compose local.
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS lessons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS sender VARCHAR(240);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS subject VARCHAR(240);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS correct_option_id VARCHAR(80);
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS success_feedback TEXT;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS failure_feedback TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS training_progress_user_module_uidx ON training_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS simulation_results_user_idx ON simulation_results(user_id);
CREATE INDEX IF NOT EXISTS risk_scores_user_calculated_idx ON risk_scores(user_id, calculated_at DESC);

INSERT INTO companies (id, name, industry) VALUES
  ('10000000-0000-4000-8000-000000000001', 'CyberShield Demo Corp', 'Servicios profesionales')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, company_id, full_name, email, role, department) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ana Martínez', 'empleado@cybershield.demo', 'EMPLOYEE', 'Operaciones'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Carlos Peña', 'supervisor@cybershield.demo', 'SUPERVISOR', 'Tecnología'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Laura Gómez', 'admin@cybershield.demo', 'ADMIN', 'Seguridad'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Diego Ruiz', 'diego@cybershield.demo', 'EMPLOYEE', 'Finanzas'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Sofía Reyes', 'sofia@cybershield.demo', 'EMPLOYEE', 'Ventas')
ON CONFLICT (email) DO NOTHING;

INSERT INTO training_modules (id, title, category, difficulty, estimated_minutes, description, lessons) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Detectar correos de phishing', 'PHISHING', 'BASIC', 8, 'Identifica dominios falsos, enlaces sospechosos y urgencia manipulada.', '[{"title":"Verifica el remitente"},{"title":"Inspecciona antes de actuar"},{"title":"Reporta la amenaza"}]'),
  ('30000000-0000-4000-8000-000000000002', 'Contraseñas seguras y MFA', 'PASSWORDS', 'BASIC', 6, 'Crea credenciales resistentes y activa autenticación multifactor.', '[{"title":"Una clave por servicio"},{"title":"Frases largas"},{"title":"Activa MFA"}]'),
  ('30000000-0000-4000-8000-000000000003', 'Ingeniería social en el trabajo', 'SOCIAL_ENGINEERING', 'INTERMEDIATE', 10, 'Reconoce solicitudes que explotan confianza, autoridad y presión.', '[{"title":"Pausa ante la presión"},{"title":"Verifica la identidad"},{"title":"Protege la información"}]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO simulations (id, title, category, scenario, difficulty, sender, subject, options, correct_option_id, success_feedback, failure_feedback) VALUES
  ('40000000-0000-4000-8000-000000000001', 'Factura pendiente urgente', 'PHISHING', 'Un correo exige pagar una factura hoy desde un dominio alterado.', 'BASIC', 'billing@micr0soft-alerts.example', 'URGENTE: su cuenta será suspendida hoy', '[{"id":"open-link","label":"Abrir el enlace"},{"id":"report","label":"Reportar y verificar en el portal oficial"}]', 'report', 'Detectaste el dominio alterado.', 'La urgencia y el dominio alterado son señales de phishing.'),
  ('40000000-0000-4000-8000-000000000002', 'Solicitud del director por chat', 'SOCIAL_ENGINEERING', 'Una cuenta externa pide comprar tarjetas de regalo de forma confidencial.', 'INTERMEDIATE', 'Director General (cuenta externa)', 'Necesito tu ayuda, es confidencial', '[{"id":"comply","label":"Comprar las tarjetas"},{"id":"verify","label":"Verificar y reportar"}]', 'verify', 'Verificaste por un canal independiente.', 'Las solicitudes fuera de canales oficiales deben verificarse.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO training_progress (user_id, module_id, status, progress_percent, completed_at) VALUES
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'COMPLETED', 100, NOW()),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'IN_PROGRESS', 45, NULL),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'COMPLETED', 100, NOW()),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'COMPLETED', 100, NOW()),
  ('20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'COMPLETED', 100, NOW())
ON CONFLICT (user_id, module_id) DO NOTHING;
