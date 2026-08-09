import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../core/models.js';

export type Permission = 'TRAIN' | 'VIEW_OWN_RISK' | 'VIEW_REPORTS' | 'VIEW_ADMIN_DASHBOARD';

interface AuthorizationStrategy { can(permission: Permission): boolean }

class EmployeeAuthorizationStrategy implements AuthorizationStrategy {
  can(permission: Permission): boolean {
    return permission === 'TRAIN' || permission === 'VIEW_OWN_RISK';
  }
}

class ElevatedAuthorizationStrategy implements AuthorizationStrategy {
  can(_permission: Permission): boolean { return true; }
}

const strategies: Record<UserRole, AuthorizationStrategy> = {
  EMPLOYEE: new EmployeeAuthorizationStrategy(),
  SUPERVISOR: new ElevatedAuthorizationStrategy(),
  ADMIN: new ElevatedAuthorizationStrategy()
};

export function authorize(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.currentUser;
    if (!user || !strategies[user.role].can(permission)) {
      res.status(403).json({ error: { message: 'Tu rol no tiene permiso para acceder a este recurso.' } });
      return;
    }
    next();
  };
}
