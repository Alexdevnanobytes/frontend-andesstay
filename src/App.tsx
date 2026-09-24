import { useState } from 'react';
import { useMsal } from '@azure/msal-react';

import {
  apiScope,
  entraConfigured,
  redirectUri
} from './auth/msal';

import { useSession } from './context/SessionContext';
import Reservations from './pages/Reservations';
import Catalog from './pages/Catalog';

type View = 'inicio' | 'reservas' | 'catalogo';

export default function App() {
  const { instance, accounts } = useMsal();
  const session = useSession();

  const [view, setView] = useState<View>('inicio');

  const login = async () => {
    await instance.loginRedirect({
      scopes: [apiScope]
    });
  };

  const logout = async () => {
    session.clear();

    await instance.logoutRedirect({
      postLogoutRedirectUri: redirectUri
    });
  };

  if (accounts.length === 0) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '60px auto',
          padding: 24
        }}
      >
        <h1>AndesStay</h1>

        <p>
          Sistema de gestión de reservas y unidades.
        </p>

        {!entraConfigured && (
          <p>
            Microsoft Entra necesita sus valores en
            <code> .env</code>.
          </p>
        )}

        <button
          disabled={!entraConfigured}
          onClick={() => void login()}
        >
          Iniciar sesión con Microsoft
        </button>
      </main>
    );
  }

  if (session.loading && !session.profile) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '60px auto',
          padding: 24
        }}
      >
        <h1>AndesStay</h1>
        <p>Cargando perfil...</p>
      </main>
    );
  }

  if (!session.profile) {
    return (
      <main
        style={{
          maxWidth: 900,
          margin: '60px auto',
          padding: 24
        }}
      >
        <h1>AndesStay</h1>

        <p>
          No fue posible cargar el perfil desde la API.
        </p>

        <button
          onClick={() => void session.refresh()}
        >
          Reintentar
        </button>

        {' '}

        <button
          onClick={() => void logout()}
        >
          Salir
        </button>
      </main>
    );
  }

  const profile = session.profile;

  const canSeeCatalog =
    session.has('ADMIN', 'RECEPCIONISTA');

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '30px auto',
        padding: 24
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          marginBottom: 30
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>
            AndesStay
          </h1>

          <div>
            {profile.name}
          </div>

          <small>
            Rol: {profile.roles.join(', ')}
          </small>
        </div>

        <button
          onClick={() => void logout()}
        >
          Salir
        </button>
      </header>

      <nav
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 30
        }}
      >
        <button
          onClick={() => setView('inicio')}
        >
          Inicio
        </button>

        <button
          onClick={() => setView('reservas')}
        >
          Reservas
        </button>

        {canSeeCatalog && (
          <button
            onClick={() => setView('catalogo')}
          >
            Catálogo
          </button>
        )}
      </nav>

      {view === 'inicio' && (
        <section>
          <h2>Inicio</h2>

          <p>
            Bienvenido, {profile.name}.
          </p>

          <p>
            Sesión autenticada correctamente con Microsoft Entra.
          </p>

          {session.has('ADMIN') && (
            <p>
              Perfil administrador: puedes gestionar reservas y catálogo.
            </p>
          )}

          {session.has('RECEPCIONISTA') && (
            <p>
              Perfil recepcionista: puedes gestionar las operaciones de reservas.
            </p>
          )}

          {session.has('HUESPED') && (
            <p>
              Perfil huésped: puedes consultar y gestionar tus reservas.
            </p>
          )}
        </section>
      )}

      {view === 'reservas' && (
        <Reservations />
      )}

      {view === 'catalogo' &&
        canSeeCatalog && (
          <Catalog />
        )}
    </main>
  );
}
