import type { TrainingStatus } from '../../core/models.js';
import { EventBus } from '../../core/event-bus.js';
import { HttpError } from '../../core/http-error.js';
import { store } from '../../data/seed-store.js';

export class TrainingService {
  constructor(private readonly eventBus: EventBus) {}

  listForUser(userId: string) {
    return store.trainingModules.map((module) => ({ ...module, progress: this.getProgress(userId, module.id) }));
  }

  getForUser(userId: string, moduleId: string) {
    const module = store.trainingModules.find((candidate) => candidate.id === moduleId);
    if (!module) throw new HttpError(404, 'Módulo no encontrado.');
    return { ...module, progress: this.getProgress(userId, moduleId) };
  }

  listProgress(userId: string) {
    return store.trainingModules.map((module) => ({ ...this.getProgress(userId, module.id), moduleTitle: module.title }));
  }

  updateProgress(userId: string, moduleId: string, status: TrainingStatus, requestedPercent?: number) {
    if (!store.trainingModules.some((module) => module.id === moduleId)) throw new HttpError(404, 'Módulo no encontrado.');
    const existing = store.trainingProgress.find((item) => item.userId === userId && item.moduleId === moduleId);
    const wasCompleted = existing?.status === 'COMPLETED';
    const progressPercent = status === 'COMPLETED' ? 100 : status === 'NOT_STARTED' ? 0 : Math.min(99, Math.max(1, requestedPercent ?? 25));
    const updated = {
      userId, moduleId, status, progressPercent, updatedAt: new Date().toISOString(),
      ...(status === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {})
    };
    if (existing) Object.assign(existing, updated);
    else store.trainingProgress.push(updated);
    if (status === 'COMPLETED' && !wasCompleted) this.eventBus.publish('training.completed', { userId, moduleId });
    return updated;
  }

  private getProgress(userId: string, moduleId: string) {
    return store.trainingProgress.find((item) => item.userId === userId && item.moduleId === moduleId) ?? {
      userId, moduleId, status: 'NOT_STARTED' as const, progressPercent: 0, updatedAt: new Date(0).toISOString()
    };
  }
}
