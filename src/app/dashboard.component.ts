import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';
import { Dashboard } from './models';
import { SessionService } from './session.service';

@Component({selector: 'app-dashboard', standalone: false, template: `
  <section class="page-heading"><div class="eyebrow">RESUMEN</div>
    <h1>Bienvenido{{session.profile?.name ? ', ' + session.profile?.name : ''}}</h1>
    <p *ngIf="session.has('HUESPED') && !session.has('ADMIN','RECEPCIONISTA')">Aquí puedes seguir tus reservas.</p>
    <p *ngIf="session.has('ADMIN','RECEPCIONISTA')">Ocupación y movimientos del día.</p>
  </section>
  <div *ngIf="error" class="alert">{{error}}</div>
  <div class="stats" *ngIf="data">
    <div class="stat"><span>Reservas</span><strong>{{data.totalReservations}}</strong></div>
    <div class="stat"><span>En estadía</span><strong>{{data.occupied}}</strong></div>
    <div class="stat"><span>Llegadas hoy</span><strong>{{data.arrivalsToday}}</strong></div>
    <div class="stat"><span>Salidas hoy</span><strong>{{data.departuresToday}}</strong></div>
  </div>
  <section class="card" *ngIf="data"><div class="section-row"><h2>Reservas recientes</h2><a routerLink="/reservations">Ver reservas →</a></div>
    <p *ngIf="!data.reservations.length">Todavía no hay reservas para mostrar.</p>
    <div class="table-scroll" *ngIf="data.reservations.length"><table><thead><tr><th>Unidad</th><th>Fechas</th><th>Estado</th></tr></thead>
      <tbody><tr *ngFor="let r of data.reservations.slice(0, 6)"><td>{{r.unitId}}</td><td>{{r.checkIn}} al {{r.checkOut}}</td><td><span class="badge">{{r.status}}</span></td></tr></tbody></table></div>
  </section>`})
export class DashboardComponent implements OnInit {
  data?: Dashboard;
  error = '';
  constructor(private readonly api: ApiService, public readonly session: SessionService) {}
  ngOnInit(): void { this.api.dashboard().subscribe({next: data => this.data = data, error: () => this.error = 'No se pudo cargar el resumen.'}); }
}
