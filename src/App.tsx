import { useContext, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { AuthContext } from 'react-oidc-context';

import {
  apiScope,
  entraConfigured,
  redirectUri
} from './auth/msal';
import {
  cognitoConfigured,
  cognitoLogoutUrl
} from './auth/cognito';

import { useSession } from './context/SessionContext';
import Reservations from './pages/Reservations';
import Catalog from './pages/Catalog';

type View = 'inicio' | 'reservas' | 'catalogo';

export default function App() {
  const { instance, accounts } = useMsal();
  // Amazon Cognito: undefined cuando no hay AuthProvider (Cognito sin configurar).
  const cognito = useContext(AuthContext);
  const session = useSession();

  const usingCognito = Boolean(cognito?.isAuthenticated);
  const authenticated = accounts.length > 0 || usingCognito;
  const providerName = usingCognito
    ? 'Amazon Cognito'
    : 'Microsoft Entra';

  const [view, setView] = useState<View>('inicio');

  const login = async () => {
    await instance.loginRedirect({
      scopes: [apiScope]
    });
  };

  const loginCognito = async () => {
    await cognito?.signinRedirect();
  };

  const logout = async () => {
    session.clear();

    if (usingCognito) {
      // Amazon Cognito: borra la sesión local y la del Hosted UI.
      await cognito?.removeUser();
      const url = cognitoLogoutUrl();
      if (url) window.location.assign(url);
      return;
    }

    await instance.logoutRedirect({
      postLogoutRedirectUri: redirectUri
    });
  };

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">▲</div>

          <h1>AndesStay</h1>

          <p>
            Plataforma de gestión de reservas,
            estadías y unidades.
          </p>

          {!entraConfigured && (
            <div className="alert">
              Microsoft Entra todavía necesita
              configuración.
            </div>
          )}

          <button
            className="login-button"
            disabled={!entraConfigured}
            onClick={() => void login()}
          >
            Iniciar sesión con Microsoft
          </button>

          {cognitoConfigured && (
            <button
              className="login-button"
              disabled={Boolean(cognito?.isLoading)}
              onClick={() => void loginCognito()}
            >
              Iniciar sesión con Amazon Cognito
            </button>
          )}
        </section>
      </main>
    );
  }

  if (session.loading && !session.profile) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">▲</div>
          <h1>AndesStay</h1>
          <p>Cargando tu perfil...</p>
        </section>
      </main>
    );
  }

  if (!session.profile) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">▲</div>

          <h1>AndesStay</h1>

          <div className="alert">
            No fue posible cargar el perfil desde la API.
          </div>

          <div className="actions">
            <button
              className="primary"
              onClick={() => void session.refresh()}
            >
              Reintentar
            </button>

            <button
              className="secondary"
              onClick={() => void logout()}
            >
              Salir
            </button>
          </div>
        </section>
      </main>
    );
  }

  const profile = session.profile;

  const canSeeCatalog =
    session.has('ADMIN', 'RECEPCIONISTA');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            ▲
          </div>

          <div className="brand-copy">
            <h1>AndesStay</h1>
            <p>
              Gestión hotelera y reservas
            </p>
          </div>
        </div>

        <div className="user-chip">
          <div className="user-data">
            <div className="user-name">
              {profile.name}
            </div>

            <div className="user-role">
              {profile.roles.join(' · ')}
            </div>
          </div>

          <button
            className="logout-button"
            onClick={() => void logout()}
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={
            view === 'inicio'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setView('inicio')}
        >
          Inicio
        </button>

        <button
          className={
            view === 'reservas'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setView('reservas')}
        >
          Reservas
        </button>

        {canSeeCatalog && (
          <button
            className={
              view === 'catalogo'
                ? 'nav-button active'
                : 'nav-button'
            }
            onClick={() => setView('catalogo')}
          >
            Catálogo
          </button>
        )}
      </nav>

      <main className="app-content">
        {view === 'inicio' && (
          <>
            <section className="page-heading">
              <div className="eyebrow">
                PANEL PRINCIPAL
              </div>

              <h1>
                Bienvenido, {profile.name}
              </h1>

              <p>
                Administra las operaciones de AndesStay
                desde un solo lugar.
              </p>
            </section>

            <section className="hero-card">
              <h2>
                Sesión autenticada correctamente
              </h2>

              <p>
                {providerName} confirmó tu identidad
                y tus permisos dentro de la plataforma.
              </p>

              <div className="dashboard-grid">
                <div className="dashboard-item">
                  <strong>
                    Perfil
                  </strong>

                  <span>
                    {profile.roles.join(', ')}
                  </span>
                </div>

                <div className="dashboard-item">
                  <strong>
                    Reservas
                  </strong>

                  <span>
                    Gestiona estadías y estados.
                  </span>
                </div>

                {canSeeCatalog && (
                  <div className="dashboard-item">
                    <strong>
                      Catálogo
                    </strong>

                    <span>
                      Consulta unidades y disponibilidad.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {view === 'reservas' && (
          <Reservations />
        )}

        {view === 'catalogo' &&
          canSeeCatalog && (
            <Catalog />
          )}
      </main>
    </div>
  );
}
