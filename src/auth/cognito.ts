// Configuración del login con Amazon Cognito usando OIDC (librería oidc-client-ts / react-oidc-context).
import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

import { redirectUri } from './msal';

// Amazon Cognito: User Pool, App Client y dominio del Hosted UI.
// authority: https://cognito-idp.<región>.amazonaws.com/<User Pool ID>. De ahí la librería lee la
// metadata OIDC (endpoints de login, token y llaves). domain: dominio del login administrado, para el logout.
const authority = import.meta.env.VITE_COGNITO_AUTHORITY ?? '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const domain = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');

// Scope propio del resource server "andesstay-api" (equivale a access_as_user de Entra).
export const cognitoApiScope =
  import.meta.env.VITE_COGNITO_API_SCOPE || 'andesstay-api/access_as_user';

// Cognito está activo solo si hay authority y client ID reales. Si no, no se muestra su botón.
export const cognitoConfigured =
  Boolean(authority) && Boolean(clientId) && !clientId.startsWith('SET_');

// Opciones de AuthProvider (react-oidc-context):
export const cognitoAuthConfig: AuthProviderProps = {
  authority,
  // client_id: app client del User Pool (público, sin secreto).
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: redirectUri,
  // response_type 'code': flujo de código de autorización. La librería agrega PKCE automáticamente.
  response_type: 'code',
  // Scopes pedidos: openid (identidad) y el scope propio de la API. Sin este último, el API Gateway rechaza el token.
  scope: `openid ${cognitoApiScope}`,
  // Los tokens de Cognito también se guardan en sessionStorage.
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Quita ?code=...&state=... de la URL después del login.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

// Cierra también la sesión del inicio de sesión administrado de Cognito (endpoint /logout del dominio).
export function cognitoLogoutUrl(): string | null {
  if (!domain) return null;
  // Arma https://<dominio>/logout?client_id=...&logout_uri=... para cerrar la sesión en Cognito.
  // logout_uri debe estar registrada en las URL de cierre de sesión del app client.
  const params = new URLSearchParams({ client_id: clientId, logout_uri: redirectUri });
  return `${domain}/logout?${params}`;
}
