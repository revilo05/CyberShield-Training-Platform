import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { RoleMenuFactory } from '../navigation/menu.factory';
import type { RouteName } from '../types';

export function Layout({ route, navigate, children }: { route: RouteName; navigate: (route: RouteName) => void; children: ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const menu = RoleMenuFactory.create(user.role);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('dashboard')} aria-label="Ir al resumen">
          <span className="brand-mark">C</span><span><strong>CyberShield</strong><small>Human Risk Center</small></span>
        </button>
        <nav aria-label="Navegación principal">
          {menu.map((item) => (
            <button key={item.route} className={route === item.route || (route === 'module-detail' && item.route === 'modules') ? 'nav-item active' : 'nav-item'} onClick={() => navigate(item.route)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-status"><span className="status-dot" /><div><strong>Sistema protegido</strong><small>Monitoreo activo</small></div></div>
        <button className="user-card" onClick={() => navigate('profile')}>
          <span className="avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
          <span><strong>{user.fullName}</strong><small>{user.role} · {user.department}</small></span>
        </button>
        <button className="logout" onClick={logout}>Cerrar sesión</button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
