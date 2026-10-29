// Componente principal de la aplicación. Decide qué mostrar según el estado de la sesión:
// 1) sin sesión -> pantalla de login (Microsoft y, si está configurado, Cognito);
// 2) con sesión pero cargando el perfil -> "Cargando tu perfil...";
// 3) con sesión pero sin perfil (por ejemplo, la API respondió 403) -> mensaje de error;
// 4) con perfil -> la aplicación con su menú (Inicio, Reservas y Catálogo según el rol).
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

// Vistas posibles del menú. Se cambia de vista con un estado local (no hay URLs distintas por vista).
type View = 'inicio' | 'reservas' | 'catalogo';

export default function App() {
  // Sesión de Microsoft (MSAL): instancia y cuentas con sesión iniciada.
  const { instance, accounts } = useMsal();
  // Amazon Cognito: undefined cuando no hay AuthProvider (Cognito sin configurar).
  const cognito = useContext(AuthContext);
  // Perfil cargado desde el BFF (roles incluidos).
  const session = useSession();

  // ¿Hay sesión con alguno de los dos proveedores? ¿Con cuál? (para el texto de bienvenida)
  const usingCognito = Boolean(cognito?.isAuthenticated);
  const authenticated = accounts.length > 0 || usingCognito;
  const providerName = usingCognito
    ? 'Amazon Cognito'
    : 'Microsoft Entra';

  // Vista seleccionada en el menú; parte en "inicio".
  const [view, setView] = useState<View>('inicio');

  // Login con Microsoft: redirige a login.microsoftonline.com pidiendo el scope de la API.
  // Al volver, main.tsx procesa la respuesta con handleRedirectPromise().
  const login = async () => {
    await instance.loginRedirect({
      scopes: [apiScope]
    });
  };

  // Login con Cognito: redirige al login administrado del User Pool (código de autorización + PKCE).
  const loginCognito = async () => {
    await cognito?.signinRedirect();
  };

  // Cerrar sesión: primero borra el perfil guardado en el contexto.
  const logout = async () => {
    session.clear();

    if (usingCognito) {
      // Amazon Cognito: borra la sesión local y la del Hosted UI.
      await cognito?.removeUser();
      const url = cognitoLogoutUrl();
      if (url) window.location.assign(url);
      return;
    }

    // Microsoft: cierra la sesión en Entra ID y vuelve a redirectUri.
    await instance.logoutRedirect({
      postLogoutRedirectUri: redirectUri
    });
  };

  // Caso 1: no hay sesión -> pantalla de login.
  if (!authenticated) {
    return (
      <main className="login-page">
        {/* Tarjeta de login con el logo, el título y los botones de inicio de sesión. */}
        <section className="login-card">
          <div className="login-logo">▲</div>

          <h1>AndesStay</h1>

          <p>
            Plataforma de gestión de reservas,
            estadías y unidades.
          </p>

          {/* Aviso si faltan las variables de Entra ID en el .env. */}
          {!entraConfigured && (
            <div className="alert">
              Microsoft Entra todavía necesita
              configuración.
            </div>
          )}

          {/* Botón de Microsoft: deshabilitado si Entra ID no está configurado. */}
          <button
            className="login-button"
            disabled={!entraConfigured}
            onClick={() => void login()}
          >
            Iniciar sesión con Microsoft
          </button>

          {/* Botón de Cognito: solo aparece si Cognito está configurado; se deshabilita mientras procesa. */}
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

  // Caso 2: hay sesión y el perfil todavía se está cargando (GET /me en curso).
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

  // Caso 3: hay sesión pero no se pudo cargar el perfil. Las causas típicas son un 403 (usuario sin rol),
  // un 401 (token rechazado) o un 503 (backend caído). Permite reintentar o salir.
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

  // Caso 4: perfil cargado -> aplicación completa.
  const profile = session.profile;

  // El menú Catálogo solo se muestra al personal. Si un huésped llamara igual a la API, el BFF respondería 403.
  const canSeeCatalog =
    session.has('ADMIN', 'RECEPCIONISTA');

  return (
    // Estructura de la app: cabecera, menú y contenido.
    <div className="app-shell">
      {/* Cabecera: marca, datos del usuario (nombre y roles) y botón Salir. */}
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

      {/* Menú de navegación. El botón activo lleva la clase CSS "active". */}
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

        {/* Catálogo: solo para ADMIN y RECEPCIONISTA. */}
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

      {/* Contenido según la vista seleccionada. */}
      <main className="app-content">
        {/* Vista Inicio: bienvenida, proveedor con el que se inició sesión y accesos según el rol. */}
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

        {/* Vista Reservas (página src/pages/Reservations.tsx). */}
        {view === 'reservas' && (
          <Reservations />
        )}

        {/* Vista Catálogo: doble condición, así un huésped no puede verla aunque cambie la vista. */}
        {view === 'catalogo' &&
          canSeeCatalog && (
            <Catalog />
          )}
      </main>
    </div>
  );
}
