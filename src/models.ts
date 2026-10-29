// Tipos de TypeScript que describen los datos que envía y recibe la API.
// No generan código: solo sirven para que el editor y el compilador detecten errores.
export type Role = 'ADMIN' | 'RECEPCIONISTA' | 'HUESPED';

// Estados posibles de una reserva (iguales al enum ReservationStatus de ms-andesstay-reservations).
export type Status =
  | 'CREADA'
  | 'CONFIRMADA'
  | 'CHECKIN_PENDIENTE'
  | 'EN_ESTADIA'
  | 'CHECKOUT'
  | 'CANCELADA';

// Perfil del usuario (respuesta de GET /me).
export interface Profile {
  id: string;
  name: string;
  roles: Role[];
}

// Reserva. Las fechas llegan como texto "AAAA-MM-DD".
export interface Reservation {
  id: string;
  guestId: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: Status;
  createdAt: string;
}

// Unidad del catálogo (habitación o cabaña).
export interface Unit {
  id: string;
  code: string;
  type: 'HABITACION' | 'CABANA';
  description: string;
  nightlyRate: number;
  active: boolean;
}

// Resumen del dashboard (lo calcula el BFF).
export interface Dashboard {
  totalReservations: number;
  occupied: number;
  arrivalsToday: number;
  departuresToday: number;
  reservations: Reservation[];
}
