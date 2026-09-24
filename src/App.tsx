import { useMsal } from '@azure/msal-react';
import { apiScope, entraConfigured, redirectUri } from './auth/msal';

export default function App() {
  const { instance, accounts } = useMsal();

  const login = async () => {
    await instance.loginRedirect({
      scopes: [apiScope]
    });
  };

  const logout = async () => {
    await instance.logoutRedirect({
      postLogoutRedirectUri: redirectUri
    });
  };

  return (
    <main style={{ maxWidth: 900, margin: '60px auto', padding: 24 }}>
      <h1>AndesStay</h1>
      <p>Frontend React funcionando correctamente.</p>

      {!entraConfigured && (
        <p>
          Microsoft Entra todavía necesita sus valores reales en el archivo
          <code> .env</code>.
        </p>
      )}

      {accounts.length === 0 ? (
        <button disabled={!entraConfigured} onClick={login}>
          Iniciar sesión con Microsoft
        </button>
      ) : (
        <>
          <p>Sesión iniciada: {accounts[0].name ?? accounts[0].username}</p>
          <button onClick={logout}>Salir</button>
        </>
      )}
    </main>
  );
}
