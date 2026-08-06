CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  industry VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  role VARCHAR(40) NOT NULL CHECK (role IN ('EMPLOYEE', 'SUPERVISOR', 'ADMIN')),
  department VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  category VARCHAR(60) NOT NULL,
  difficulty VARCHAR(60) NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  module_id UUID NOT NULL REFERENCES training_modules(id),
  status VARCHAR(40) NOT NULL CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  progress_percent INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  category VARCHAR(60) NOT NULL,
  scenario TEXT NOT NULL,
  difficulty VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  simulation_id UUID NOT NULL REFERENCES simulations(id),
  was_successful BOOLEAN NOT NULL,
  risk_points INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  level VARCHAR(20) NOT NULL CHECK (level IN ('LOW', 'MEDIUM', 'HIGH')),
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
