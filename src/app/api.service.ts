import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Dashboard, Profile, Reservation, Status, Unit } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = `${environment.apiBase}/api`;
  constructor(private readonly http: HttpClient) {}
  me(): Observable<Profile> { return this.http.get<Profile>(`${this.base}/me`); }
  dashboard(): Observable<Dashboard> { return this.http.get<Dashboard>(`${this.base}/dashboard`); }
  reservations(): Observable<Reservation[]> { return this.http.get<Reservation[]>(`${this.base}/reservations`); }
  createReservation(data: {guestId?: string; unitId: string; checkIn: string; checkOut: string}): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/reservations`, data);
  }
  updateReservation(id: string, data: {unitId: string; checkIn: string; checkOut: string}): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.base}/reservations/${id}`, data);
  }
  deleteReservation(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/reservations/${id}`); }
  changeStatus(id: string, status: Status): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.base}/reservations/${id}/status`, {status});
  }
  available(from: string, to: string): Observable<Unit[]> {
    return this.http.get<Unit[]>(`${this.base}/catalog/available`, {params: new HttpParams().set('from', from).set('to', to)});
  }
  units(): Observable<Unit[]> { return this.http.get<Unit[]>(`${this.base}/catalog/units`); }
  createUnit(unit: {code: string; type: string; description: string; nightlyRate: number}): Observable<Unit> {
    return this.http.post<Unit>(`${this.base}/catalog/units`, unit);
  }
  updateUnit(id: string, unit: {code: string; type: string; description: string; nightlyRate: number}): Observable<Unit> {
    return this.http.put<Unit>(`${this.base}/catalog/units/${id}`, unit);
  }
  deleteUnit(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/catalog/units/${id}`); }
}
