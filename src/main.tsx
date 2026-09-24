import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider } from 'react-oidc-context';

import App from './App';
import { msalInstance } from './auth/msal';
import { cognitoAuthConfig, cognitoConfigured } from './auth/cognito';
import { SessionProvider } from './context/SessionContext';

async function start() {
  await msalInstance.initialize();

  const response =
    await msalInstance.handleRedirectPromise();

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

  const session = (
    <SessionProvider>
      <App />
    </SessionProvider>
  );

  ReactDOM.createRoot(
    document.getElementById('root')!
  ).render(
    <React.StrictMode>
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
