import { PublicClientApplication } from '@azure/msal-browser';

export const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID ?? '';
export const frontendClientId =
  import.meta.env.VITE_ENTRA_FRONTEND_CLIENT_ID ?? '';

export const apiScope =
  import.meta.env.VITE_API_SCOPE ?? '';

export const redirectUri =
  import.meta.env.VITE_REDIRECT_URI || 'http://localhost:4200/';

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: frontendClientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri
  },
  cache: {
    cacheLocation: 'sessionStorage'
  }
});

export const entraConfigured =
  Boolean(tenantId) &&
  Boolean(frontendClientId) &&
  Boolean(apiScope) &&
  !tenantId.startsWith('SET_') &&
  !frontendClientId.startsWith('SET_') &&
  !apiScope.includes('SET_');
