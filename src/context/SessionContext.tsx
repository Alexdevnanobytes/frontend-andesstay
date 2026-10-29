// Contexto de sesión: guarda el perfil del usuario autenticado (id, nombre y roles, que entrega el BFF)
// y lo comparte con toda la app mediante useSession(). Funciona igual con Microsoft y con Cognito.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';

import { useMsal } from '@azure/msal-react';
import { AuthContext } from 'react-oidc-context';
import { api, setCognitoToken } from '../services/api';
import type { Profile, Role } from '../models';

// Lo que el contexto ofrece a los componentes:
// - profile: perfil actual (null si no hay sesión o no se pudo cargar).
// - loading: true mientras se consulta /me.
// - ensure: carga el perfil si aún no está cargado.
// - refresh: vuelve a consultarlo (botón "Reintentar").
// - clear: lo borra (al cerrar sesión).
// - has('ADMIN', ...): true si el usuario tiene alguno de esos roles.
interface SessionValue {
  profile: Profile | null;
  loading: boolean;
  ensure: () => Promise<Profile>;
  refresh: () => Promise<Profile>;
  clear: () => void;
  has: (...roles: Role[]) => boolean;
}

// El contexto de React. Arranca en null; SessionProvider le pone el valor real.
const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  children
}: {
  children: ReactNode;
}) {
  // Estado de MSAL: la instancia y las cuentas con sesión de Microsoft.
  const { instance, accounts } = useMsal();
  // Amazon Cognito: undefined cuando Cognito no está configurado (sin AuthProvider).
  const cognito = useContext(AuthContext);
  const cognitoAccessToken = cognito?.isAuthenticated
    ? cognito.user?.access_token ?? null
    : null;

  // Se asigna durante el render para que el primer /api/me ya use el token de Cognito.
  setCognitoToken(cognitoAccessToken);

  const authenticated =
    accounts.length > 0 || Boolean(cognitoAccessToken);

  // El access token de Cognito no trae el correo; el ID token sí (solo para mostrarlo).
  const cognitoEmail = cognitoAccessToken
    ? cognito?.user?.profile.email ?? null
    : null;

  // Estado local del componente: el perfil y si se está cargando.
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] = useState(false);

  // Carga el perfil desde el BFF (GET /me) solo si todavía no está cargado.
  // useCallback evita recrear la función en cada render.
  const ensure = useCallback(async () => {
    if (profile) return profile;

    setLoading(true);

    try {
      const result = await api.me(instance);
      setProfile(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [instance, profile]);

  // Fuerza una nueva consulta del perfil.
  const refresh = useCallback(async () => {
    setProfile(null);
    setLoading(true);

    try {
      const result = await api.me(instance);
      setProfile(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [instance]);

  const clear = () => {
    setProfile(null);
  };

  // Revisa roles para mostrar u ocultar partes de la interfaz. La protección real está en el BFF (403).
  const has = (...roles: Role[]) =>
    profile?.roles.some(role => roles.includes(role)) ?? false;

  // Cada vez que cambia el estado de autenticación: si no hay sesión se borra el perfil;
  // si hay sesión se carga. Si /me falla (por ejemplo 403 por falta de rol), el perfil queda en null
  // y App muestra "No fue posible cargar el perfil desde la API".
  useEffect(() => {
    if (!authenticated) {
      setProfile(null);
      return;
    }

    void ensure().catch(() => {
      setProfile(null);
    });
  }, [authenticated, ensure]);

  // Entrega el valor a los componentes hijos. Si la sesión es de Cognito, el nombre visible
  // es el correo (el access token de Cognito trae un id interno en vez del nombre).
  return (
    <SessionContext.Provider
      value={{
        profile:
          profile && cognitoEmail
            ? { ...profile, name: cognitoEmail }
            : profile,
        loading,
        ensure,
        refresh,
        clear,
        has
      }}
    >
      {/* Toda la aplicación queda dentro del provider. */}
      {children}
    </SessionContext.Provider>
  );
}

// Hook para leer la sesión desde cualquier componente: const session = useSession();
// Lanza un error si se usa fuera de SessionProvider (error de programación).
export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      'useSession debe usarse dentro de SessionProvider'
    );
  }

  return context;
}
