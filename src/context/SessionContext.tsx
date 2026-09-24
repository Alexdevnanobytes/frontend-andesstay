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

interface SessionValue {
  profile: Profile | null;
  loading: boolean;
  ensure: () => Promise<Profile>;
  refresh: () => Promise<Profile>;
  clear: () => void;
  has: (...roles: Role[]) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  children
}: {
  children: ReactNode;
}) {
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

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] = useState(false);

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

  const has = (...roles: Role[]) =>
    profile?.roles.some(role => roles.includes(role)) ?? false;

  useEffect(() => {
    if (!authenticated) {
      setProfile(null);
      return;
    }

    void ensure().catch(() => {
      setProfile(null);
    });
  }, [authenticated, ensure]);

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
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      'useSession debe usarse dentro de SessionProvider'
    );
  }

  return context;
}
