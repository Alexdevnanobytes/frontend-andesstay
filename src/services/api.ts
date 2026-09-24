import {
  InteractionRequiredAuthError,
  type IPublicClientApplication
} from '@azure/msal-browser';

import { apiScope } from '../auth/msal';

import type {
  Dashboard,
  Profile,
  Reservation,
  Status,
  Unit
} from '../models';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

// Amazon Cognito: en el API Gateway cada proveedor tiene su ruta y su authorizer.
// Contra el BFF directo (sin API Gateway) usar VITE_COGNITO_API_PATH=/api.
const COGNITO_PREFIX = import.meta.env.VITE_COGNITO_API_PATH || '/cognito/api';

let cognitoToken: string | null = null;

// SessionProvider actualiza este token cuando la sesión activa es de Cognito.
export function setCognitoToken(token: string | null) {
  cognitoToken = token;
}

async function getToken(
  instance: IPublicClientApplication
): Promise<string> {
  if (cognitoToken) return cognitoToken;

  const account =
    instance.getActiveAccount() ??
    instance.getAllAccounts()[0];

  if (!account) {
    throw new Error('No hay una sesión iniciada.');
  }

  try {
    const result = await instance.acquireTokenSilent({
      account,
      scopes: [apiScope]
    });

    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({
        scopes: [apiScope]
      });
    }

    throw error;
  }
}

async function request<T>(
  instance: IPublicClientApplication,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getToken(instance);
  const prefix = cognitoToken ? COGNITO_PREFIX : '/api';

  const response = await fetch(`${API_BASE}${prefix}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch {
      // respuesta sin JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: (instance: IPublicClientApplication) =>
    request<Profile>(instance, '/me'),

  dashboard: (instance: IPublicClientApplication) =>
    request<Dashboard>(instance, '/dashboard'),

  reservations: (instance: IPublicClientApplication) =>
    request<Reservation[]>(instance, '/reservations'),

  createReservation: (
    instance: IPublicClientApplication,
    data: {
      guestId?: string;
      unitId: string;
      checkIn: string;
      checkOut: string;
    }
  ) =>
    request<Reservation>(instance, '/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateReservation: (
    instance: IPublicClientApplication,
    id: string,
    data: {
      unitId: string;
      checkIn: string;
      checkOut: string;
    }
  ) =>
    request<Reservation>(instance, `/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteReservation: (
    instance: IPublicClientApplication,
    id: string
  ) =>
    request<void>(instance, `/reservations/${id}`, {
      method: 'DELETE'
    }),

  changeStatus: (
    instance: IPublicClientApplication,
    id: string,
    status: Status
  ) =>
    request<Reservation>(instance, `/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  available: (
    instance: IPublicClientApplication,
    from: string,
    to: string
  ) =>
    request<Unit[]>(
      instance,
      `/catalog/available?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),

  units: (instance: IPublicClientApplication) =>
    request<Unit[]>(instance, '/catalog/units'),

  createUnit: (
    instance: IPublicClientApplication,
    unit: {
      code: string;
      type: string;
      description: string;
      nightlyRate: number;
    }
  ) =>
    request<Unit>(instance, '/catalog/units', {
      method: 'POST',
      body: JSON.stringify(unit)
    }),

  updateUnit: (
    instance: IPublicClientApplication,
    id: string,
    unit: {
      code: string;
      type: string;
      description: string;
      nightlyRate: number;
    }
  ) =>
    request<Unit>(instance, `/catalog/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(unit)
    }),

  deleteUnit: (
    instance: IPublicClientApplication,
    id: string
  ) =>
    request<void>(instance, `/catalog/units/${id}`, {
      method: 'DELETE'
    })
};
