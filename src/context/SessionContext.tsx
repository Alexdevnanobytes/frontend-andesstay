import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';

import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';
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
    if (!accounts.length) {
      setProfile(null);
      return;
    }

    void ensure().catch(() => {
      setProfile(null);
    });
  }, [accounts.length, ensure]);

  return (
    <SessionContext.Provider
      value={{
        profile,
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
