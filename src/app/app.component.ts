import { Component, OnDestroy, OnInit } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, Subscription } from 'rxjs';
import { environment } from '../environments/environment';
import { SessionService } from './session.service';

@Component({selector: 'app-root', standalone: false, templateUrl: './app.component.html'})
export class AppComponent implements OnInit, OnDestroy {
  readonly ready = !Object.values(environment).some(value => typeof value === 'string' && value.includes('SET_'));
  authError = '';
  private sub?: Subscription;
  constructor(public readonly session: SessionService, private readonly msal: MsalService,
              private readonly broadcast: MsalBroadcastService) {}
  ngOnInit(): void {
    this.sub = this.broadcast.inProgress$.pipe(filter(status => status === InteractionStatus.None)).subscribe(() => {
      const account = this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0];
      if (account) {
        this.msal.instance.setActiveAccount(account);
        if (!this.session.profile) this.session.ensure().subscribe({error: () => this.authError = 'No se pudo validar tu rol o acceder a la API.'});
      }
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  logout(): void { this.session.clear(); void this.msal.logoutRedirect({postLogoutRedirectUri: environment.redirectUri}); }
}
