// Cliente de la API de AndesStay. Todas las pantallas llaman al backend a través del objeto "api".
// Cumple el papel del MsalInterceptor de Angular: obtiene el access token y lo agrega como
// Authorization: Bearer <token> en cada petición, sin que cada pantalla tenga que hacerlo.
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

// URL base del API Gateway (VITE_API_BASE), sin la barra final.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

// Amazon Cognito: en el API Gateway cada proveedor tiene su ruta y su authorizer.
// Contra el BFF directo (sin API Gateway) usar VITE_COGNITO_API_PATH=/api.
const COGNITO_PREFIX = import.meta.env.VITE_COGNITO_API_PATH || '/cognito/api';

// Access token de Cognito de la sesión actual (null si la sesión es de Microsoft o no hay sesión).
// Lo mantiene actualizado SessionContext.
let cognitoToken: string | null = null;

// SessionProvider actualiza este token cuando la sesión activa es de Cognito.
export function setCognitoToken(token: string | null) {
  cognitoToken = token;
}

// Obtiene el access token para llamar a la API.
async function getToken(
  instance: IPublicClientApplication
): Promise<string> {
  // Sesión de Cognito: se usa directamente su access token (react-oidc-context lo renueva solo).
  if (cognitoToken) return cognitoToken;

  // Sesión de Microsoft: se toma la cuenta activa.
  const account =
    instance.getActiveAccount() ??
    instance.getAllAccounts()[0];

  if (!account) {
    throw new Error('No hay una sesión iniciada.');
  }

  // acquireTokenSilent: entrega el token desde la caché o lo renueva sin mostrar pantallas.
  // Se pide el scope de la API, así el token sirve para andesstay-api.
  try {
    const result = await instance.acquireTokenSilent({
      account,
      scopes: [apiScope]
    });

    return result.accessToken;
  // Si Microsoft exige interacción (por ejemplo, la sesión expiró), se redirige al login.
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({
        scopes: [apiScope]
      });
    }

    throw error;
  }
}

// Hace una petición a la API y devuelve la respuesta ya convertida desde JSON.
async function request<T>(
  instance: IPublicClientApplication,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  // Elige el token y la ruta según el proveedor:
  // - Microsoft: /api/... (ruta del API Gateway con el authorizer de Entra ID).
  // - Cognito: /cognito/api/... (ruta con el authorizer de Cognito).
  // Ambas rutas llegan al mismo BFF.
  const token = await getToken(instance);
  const prefix = cognitoToken ? COGNITO_PREFIX : '/api';

  // Petición HTTP con el header Authorization: Bearer <token> y JSON como formato.
  const response = await fetch(`${API_BASE}${prefix}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  // Si el servidor responde error (4xx o 5xx), se lanza una excepción con el mensaje del servidor si lo hay,
  // o con "Error <código>". Las pantallas la muestran en un aviso rojo.
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

  // 204 No Content (por ejemplo, al eliminar): no hay cuerpo que convertir.
  if (response.status === 204) {
    return undefined as T;
  }

  // Respuesta exitosa con cuerpo JSON.
  return response.json() as Promise<T>;
}

// Una función por endpoint del BFF. Todas reciben la instancia de MSAL (para obtener el token).
export const api = {
  // GET /me: perfil del usuario.
  me: (instance: IPublicClientApplication) =>
    request<Profile>(instance, '/me'),

  // GET /dashboard: resumen de reservas.
  dashboard: (instance: IPublicClientApplication) =>
    request<Dashboard>(instance, '/dashboard'),

  // GET /reservations: todas (personal) o solo las propias (huésped).
  reservations: (instance: IPublicClientApplication) =>
    request<Reservation[]>(instance, '/reservations'),

  // POST /reservations: crea una reserva. guestId solo lo puede usar el personal.
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

  // PUT /reservations/{id}: edita unidad y fechas.
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

  // DELETE /reservations/{id}: elimina una reserva.
  deleteReservation: (
    instance: IPublicClientApplication,
    id: string
  ) =>
    request<void>(instance, `/reservations/${id}`, {
      method: 'DELETE'
    }),

  // PATCH /reservations/{id}/status: cambia el estado (solo personal).
  changeStatus: (
    instance: IPublicClientApplication,
    id: string,
    status: Status
  ) =>
    request<Reservation>(instance, `/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  // GET /catalog/available?from=&to=: unidades libres en esas fechas.
  // encodeURIComponent protege los valores dentro de la URL.
  available: (
    instance: IPublicClientApplication,
    from: string,
    to: string
  ) =>
    request<Unit[]>(
      instance,
      `/catalog/available?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),

  // GET /catalog/units: lista de unidades (solo personal).
  units: (instance: IPublicClientApplication) =>
    request<Unit[]>(instance, '/catalog/units'),

  // POST /catalog/units: crea una unidad (solo ADMIN).
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

  // PUT /catalog/units/{id}: edita una unidad (solo ADMIN).
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

  // DELETE /catalog/units/{id}: desactiva una unidad (solo ADMIN).
  deleteUnit: (
    instance: IPublicClientApplication,
    id: string
  ) =>
    request<void>(instance, `/catalog/units/${id}`, {
      method: 'DELETE'
    })
};
