// Punto de entrada del frontend React. Vite carga este archivo desde index.html.
// Prepara MSAL (login de Microsoft), procesa el regreso del login y monta la aplicación
// con sus "providers" (componentes que comparten estado con toda la app).
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider } from 'react-oidc-context';

import App from './App';
import { msalInstance } from './auth/msal';
import { cognitoAuthConfig, cognitoConfigured } from './auth/cognito';
import { SessionProvider } from './context/SessionContext';

// start() es async porque MSAL debe inicializarse antes de dibujar la aplicación.
async function start() {
  // Inicialización obligatoria de MSAL (versión 3 en adelante).
  await msalInstance.initialize();

  // Si el navegador viene de vuelta desde login.microsoftonline.com (URL con el código de login),
  // MSAL canjea ese código por los tokens (con PKCE) y devuelve la cuenta que inició sesión.
  const response =
    await msalInstance.handleRedirectPromise();

  // Marca como "cuenta activa" la que acaba de iniciar sesión; si no hubo login ahora,
  // usa la que ya estaba guardada en sessionStorage (por ejemplo, al recargar la página).
  if (response?.account) {
    msalInstance.setActiveAccount(
      response.account
    );
  } else {
    const account =
      msalInstance.getAllAccounts()[0];

    if (account) {
      msalInstance.setActiveAccount(account);
    }
  }

  // SessionProvider carga el perfil del usuario (/api/me) y lo comparte con toda la app.
  const session = (
    <SessionProvider>
      <App />
    </SessionProvider>
  );

  // Dibuja la aplicación dentro del <div id="root"> de index.html.
  ReactDOM.createRoot(
    document.getElementById('root')!
  ).render(
    // StrictMode: en desarrollo, React hace chequeos extra para detectar errores comunes.
    <React.StrictMode>
      {/* MsalProvider entrega MSAL a todos los componentes (useMsal()). */}
      <MsalProvider instance={msalInstance}>
        {/* Amazon Cognito: solo se monta si hay User Pool configurado en el .env. */}
        {cognitoConfigured ? (
          <AuthProvider {...cognitoAuthConfig}>{session}</AuthProvider>
        ) : (
          session
        )}
      </MsalProvider>
    </React.StrictMode>
  );
}

void start();
