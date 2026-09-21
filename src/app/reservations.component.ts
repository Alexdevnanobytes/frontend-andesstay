import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from './api.service';
import { Reservation, Status, Unit } from './models';
import { SessionService } from './session.service';

@Component({selector: 'app-reservations', standalone: false, templateUrl: './reservations.component.html'})
export class ReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  availableUnits: Unit[] = [];
  error = '';
  message = '';
  busy = false;
  editingId = '';
  form = {guestId: '', unitId: '', checkIn: this.date(1), checkOut: this.date(2)};
  private readonly transitions: Partial<Record<Status, Status>> = {
    CREADA: 'CONFIRMADA', CONFIRMADA: 'CHECKIN_PENDIENTE', CHECKIN_PENDIENTE: 'EN_ESTADIA', EN_ESTADIA: 'CHECKOUT'
  };
  constructor(private readonly api: ApiService, public readonly session: SessionService) {}
  ngOnInit(): void { this.load(); this.searchAvailability(); }
  get staff(): boolean { return this.session.has('ADMIN', 'RECEPCIONISTA'); }
  next(status: Status): Status | undefined { return this.transitions[status]; }
  label(status: Status): string { return status.replace('EN_ESTADIA', 'EN_ESTADÍA').replaceAll('_', ' '); }
  private date(offset: number): string {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private fail(error: HttpErrorResponse): void {
    this.busy = false;
    this.error = error.error?.detail || error.error?.error || `La operación falló (${error.status || 'sin conexión'}).`;
  }
  load(): void { this.api.reservations().subscribe({next: rows => this.reservations = rows, error: error => this.fail(error)}); }
  searchAvailability(): void {
    if (!this.form.checkIn || !this.form.checkOut || this.form.checkIn >= this.form.checkOut) {
      this.availableUnits = []; this.error = 'La salida debe ser posterior a la entrada.'; return;
    }
    this.error = '';
    this.api.available(this.form.checkIn, this.form.checkOut).subscribe({next: rows => {
      this.availableUnits = rows;
      if (!rows.some(unit => unit.id === this.form.unitId)) this.form.unitId = '';
    }, error: error => this.fail(error)});
  }
  save(): void {
    this.error = ''; this.message = '';
    if (!this.form.unitId || this.form.checkIn >= this.form.checkOut) { this.error = 'Selecciona una unidad y fechas válidas.'; return; }
    this.busy = true;
    const data = {unitId: this.form.unitId, checkIn: this.form.checkIn, checkOut: this.form.checkOut};
    const action = this.editingId ? this.api.updateReservation(this.editingId, data) :
      this.api.createReservation({...data, ...(this.staff && this.form.guestId ? {guestId: this.form.guestId} : {})});
    action.subscribe({next: () => { this.busy = false; this.message = 'Reserva guardada.'; this.reset(); this.load(); }, error: error => this.fail(error)});
  }
  edit(row: Reservation): void {
    this.editingId = row.id;
    this.form = {guestId: row.guestId, unitId: row.unitId, checkIn: row.checkIn, checkOut: row.checkOut};
    this.searchAvailability(); window.scrollTo({top: 0, behavior: 'smooth'});
  }
  reset(): void {
    this.editingId = ''; this.form = {guestId: '', unitId: '', checkIn: this.date(1), checkOut: this.date(2)};
    this.searchAvailability();
  }
  changeStatus(row: Reservation, status: Status): void {
    this.error = ''; this.message = ''; this.busy = true;
    this.api.changeStatus(row.id, status).subscribe({next: () => {
      this.busy = false; this.message = `Reserva actualizada a ${this.label(status)}.`; this.load(); this.searchAvailability();
    }, error: error => this.fail(error)});
  }
  remove(row: Reservation): void {
    if (!window.confirm('¿Eliminar esta reserva?')) return;
    this.busy = true;
    this.api.deleteReservation(row.id).subscribe({next: () => {
      this.busy = false; this.message = 'Reserva eliminada.'; this.load();
    }, error: error => this.fail(error)});
  }
  canDelete(row: Reservation): boolean { return row.status === 'CREADA' || row.status === 'CANCELADA'; }
  canCancel(row: Reservation): boolean {
    return this.staff && (row.status === 'CREADA' || row.status === 'CONFIRMADA' || row.status === 'CHECKIN_PENDIENTE');
  }
}
