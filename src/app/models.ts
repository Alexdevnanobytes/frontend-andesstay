export type Role = 'ADMIN' | 'RECEPCIONISTA' | 'HUESPED';
export type Status = 'CREADA' | 'CONFIRMADA' | 'CHECKIN_PENDIENTE' | 'EN_ESTADIA' | 'CHECKOUT' | 'CANCELADA';
export interface Profile { id: string; name: string; roles: Role[]; }
export interface Reservation { id: string; guestId: string; unitId: string; checkIn: string; checkOut: string; status: Status; createdAt: string; }
export interface Unit { id: string; code: string; type: 'HABITACION' | 'CABANA'; description: string; nightlyRate: number; active: boolean; }
export interface Dashboard { totalReservations: number; occupied: number; arrivalsToday: number; departuresToday: number; reservations: Reservation[]; }
