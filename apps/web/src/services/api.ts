import type { AdminDashboard, ReportRow, RiskScore, Simulation, SimulationResult, TrainingModule, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cybershield_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const payload = await response.json() as { data?: T; error?: { message: string } };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error?.message ?? 'No fue posible conectar con CyberShield.');
  return payload.data;
}

export const api = {
  demoUsers: () => request<User[]>('/api/auth/users'),
  login: (email: string) => request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => request<User>('/api/auth/me'),
  modules: () => request<TrainingModule[]>('/api/training/modules'),
  module: (id: string) => request<TrainingModule>(`/api/training/modules/${id}`),
  updateProgress: (id: string, status: TrainingModule['progress']['status'], progressPercent?: number) => request<TrainingModule['progress']>(`/api/training/progress/${id}`, { method: 'PATCH', body: JSON.stringify({ status, progressPercent }) }),
  simulations: () => request<Simulation[]>('/api/simulations'),
  submitSimulation: (id: string, optionId: string) => request<SimulationResult>(`/api/simulations/${id}/answers`, { method: 'POST', body: JSON.stringify({ optionId }) }),
  risk: () => request<RiskScore>('/api/risk-score/me'),
  adminDashboard: () => request<AdminDashboard>('/api/admin/dashboard'),
  reports: () => request<ReportRow[]>('/api/reports/progress')
};
