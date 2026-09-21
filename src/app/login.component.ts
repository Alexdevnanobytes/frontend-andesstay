import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { SessionService } from './session.service';

@Component({selector: 'app-login', standalone: false, template: `
  <section class="hero">
    <div class="eyebrow">SISTEMA DE RESERVAS · ANDESSTAY</div>
    <h1>Tu estadía comienza aquí.</h1>
    <p>Consulta disponibilidad, organiza reservas y gestiona llegadas desde un solo lugar.</p>
    <button type="button" class="primary" [disabled]="!ready" (click)="login()">Iniciar sesión con Microsoft</button>
    <p class="hint">Ingresa con el usuario de prueba asignado a tu rol.</p>
  </section>`})
export class LoginComponent implements OnInit {
  readonly ready = !environment.frontendClientId.startsWith('SET_') && !environment.tenantId.startsWith('SET_') && !environment.apiScope.includes('SET_');
  constructor(private readonly msal: MsalService, private readonly broadcast: MsalBroadcastService,
              private readonly session: SessionService, private readonly router: Router) {}
  ngOnInit(): void {
    this.broadcast.inProgress$.pipe(filter(status => status === InteractionStatus.None)).subscribe(() => {
      if (this.msal.instance.getAllAccounts().length) {
        this.session.ensure().subscribe({next: () => void this.router.navigateByUrl('/dashboard'), error: () => {}});
      }
    });
  }
  login(): void { void this.msal.loginRedirect({scopes: [environment.apiScope]}); }
}
