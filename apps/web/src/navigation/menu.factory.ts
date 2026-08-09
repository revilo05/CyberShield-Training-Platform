import type { RouteName, UserRole } from '../types';

export type MenuItem = { route: RouteName; label: string; icon: string };

const employeeMenu: MenuItem[] = [
  { route: 'dashboard', label: 'Resumen', icon: '⌂' },
  { route: 'modules', label: 'Entrenamiento', icon: '▤' },
  { route: 'simulations', label: 'Simulaciones', icon: '◎' },
  { route: 'profile', label: 'Mi riesgo', icon: '◈' }
];

export class RoleMenuFactory {
  static create(role: UserRole): MenuItem[] {
    return role === 'EMPLOYEE'
      ? employeeMenu
      : [...employeeMenu, { route: 'reports', label: 'Reportes', icon: '▥' },
          ...(role === 'ADMIN' ? [{ route: 'enterprise' as const, label: 'Enterprise Pilot', icon: '◆' }] : [])];
  }
}
