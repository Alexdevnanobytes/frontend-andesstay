import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

import { redirectUri } from './msal';

// Amazon Cognito: User Pool, App Client y dominio del Hosted UI.
const authority = import.meta.env.VITE_COGNITO_AUTHORITY ?? '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const domain = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');

// Scope propio del resource server "andesstay-api" (equivale a access_as_user de Entra).
export const cognitoApiScope =
  import.meta.env.VITE_COGNITO_API_SCOPE || 'andesstay-api/access_as_user';

export const cognitoConfigured =
  Boolean(authority) && Boolean(clientId) && !clientId.startsWith('SET_');

export const cognitoAuthConfig: AuthProviderProps = {
  authority,
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: redirectUri,
  response_type: 'code',
  scope: `openid ${cognitoApiScope}`,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Quita ?code=...&state=... de la URL después del login.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

// Cierra también la sesión del inicio de sesión administrado de Cognito (endpoint /logout del dominio).
export function cognitoLogoutUrl(): string | null {
  if (!domain) return null;
  const params = new URLSearchParams({ client_id: clientId, logout_uri: redirectUri });
  return `${domain}/logout?${params}`;
}
