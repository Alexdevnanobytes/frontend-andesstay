// Configuración de MSAL (Microsoft Authentication Library) para iniciar sesión con Microsoft Entra ID.
// Los valores vienen del archivo .env; Vite solo expone al navegador las variables que empiezan con VITE_.
import { PublicClientApplication } from '@azure/msal-browser';

// ID del tenant (directorio) de Entra ID.
export const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID ?? '';
// Client ID de la app registration andesstay-spa (la app que PIDE el token).
export const frontendClientId =
  import.meta.env.VITE_ENTRA_FRONTEND_CLIENT_ID ?? '';

// Scope de la API: api://<client-id de andesstay-api>/access_as_user.
// Al pedir este scope, Entra entrega un access token cuyo destinatario (aud) es andesstay-api.
export const apiScope =
  import.meta.env.VITE_API_SCOPE ?? '';

// A dónde vuelve el navegador después del login y del logout. Debe estar registrada en Entra (SPA).
export const redirectUri =
  import.meta.env.VITE_REDIRECT_URI || 'http://localhost:4200/';

// Instancia única de MSAL que usa toda la aplicación.
export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: frontendClientId,
    // authority: dónde se inicia sesión (el tenant de AndesStay).
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri
  },
  // sessionStorage: los tokens se guardan en la pestaña y se borran al cerrarla
  // (más seguro que localStorage, que queda guardado indefinidamente).
  cache: {
    cacheLocation: 'sessionStorage'
  }
});

// true si todas las variables de Entra están definidas y no son los valores de ejemplo "SET_...".
// Si es false, la pantalla de login deshabilita el botón de Microsoft.
export const entraConfigured =
  Boolean(tenantId) &&
  Boolean(frontendClientId) &&
  Boolean(apiScope) &&
  !tenantId.startsWith('SET_') &&
  !frontendClientId.startsWith('SET_') &&
  !apiScope.includes('SET_');
