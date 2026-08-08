import type { SimulationResult } from './models.js';

export type DomainEvents = {
  'training.completed': { userId: string; moduleId: string };
  'simulation.completed': { userId: string; result: SimulationResult };
};

type EventName = keyof DomainEvents;
type EventHandler<K extends EventName> = (payload: DomainEvents[K]) => void;

export class EventBus {
  private readonly handlers = new Map<EventName, Array<(payload: never) => void>>();

  subscribe<K extends EventName>(eventName: K, handler: EventHandler<K>): void {
    const eventHandlers = this.handlers.get(eventName) ?? [];
    eventHandlers.push(handler as (payload: never) => void);
    this.handlers.set(eventName, eventHandlers);
  }

  publish<K extends EventName>(eventName: K, payload: DomainEvents[K]): void {
    for (const handler of this.handlers.get(eventName) ?? []) handler(payload as never);
  }
}
