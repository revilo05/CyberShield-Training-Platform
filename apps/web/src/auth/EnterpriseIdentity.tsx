import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, type ReactNode } from 'react';

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

function SessionBridge({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently, error } = useAuth0();
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!isAuthenticated) { setReady(false); return; } getAccessTokenSilently().then((token) => { localStorage.setItem('cybershield_token', token); setReady(true); }).catch(() => setReady(false)); }, [isAuthenticated, getAccessTokenSilently]);
  if (error) return <div className="app-loading"><p>No fue posible validar la identidad empresarial: {error.message}</p></div>;
  if (isLoading || (isAuthenticated && !ready)) return <div className="app-loading"><span className="brand-mark large">C</span><p>Validando identidad empresarial…</p></div>;
  if (!isAuthenticated) return <div className="login-shell"><div className="login-panel"><span className="eyebrow">Acceso empresarial</span><h1>CyberShield</h1><p>Inicia sesión con la organización asignada en Auth0 y Microsoft Entra ID.</p><button className="primary-button" onClick={() => void loginWithRedirect({ authorizationParams: { organization: import.meta.env.VITE_AUTH0_ORGANIZATION } })}>Continuar con Microsoft</button></div></div>;
  return children;
}

export function EnterpriseIdentity({ children }: { children: ReactNode }) {
  if (!domain || !clientId || !audience) return children;
  return <Auth0Provider domain={domain} clientId={clientId} authorizationParams={{ redirect_uri: window.location.origin, audience, scope: 'openid profile email' }} cacheLocation="memory"><SessionBridge>{children}</SessionBridge></Auth0Provider>;
}
