import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { MsalBroadcastService, MsalGuard, MsalInterceptor, MsalModule, MsalRedirectComponent, MsalService } from '@azure/msal-angular';
import { BrowserCacheLocation, InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { CatalogComponent } from './catalog.component';
import { DashboardComponent } from './dashboard.component';
import { LoginComponent } from './login.component';
import { ReservationsComponent } from './reservations.component';
import { RoleGuard } from './role.guard';

const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'login'},
  {path: 'login', component: LoginComponent},
  {path: 'dashboard', component: DashboardComponent, canActivate: [MsalGuard]},
  {path: 'reservations', component: ReservationsComponent, canActivate: [MsalGuard]},
  {path: 'catalog', component: CatalogComponent, canActivate: [MsalGuard, RoleGuard], data: {roles: ['ADMIN', 'RECEPCIONISTA']}},
  {path: '**', redirectTo: 'login'}
];
const protectedUrl = `${environment.apiBase || window.location.origin}/api/*`;

@NgModule({
  declarations: [AppComponent, LoginComponent, DashboardComponent, ReservationsComponent, CatalogComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule, RouterModule.forRoot(routes),
    MsalModule.forRoot(
      new PublicClientApplication({auth: {clientId: environment.frontendClientId,
        authority: `https://login.microsoftonline.com/${environment.tenantId}`,
        redirectUri: environment.redirectUri, postLogoutRedirectUri: environment.redirectUri},
        cache: {cacheLocation: BrowserCacheLocation.SessionStorage}}),
      {interactionType: InteractionType.Redirect, authRequest: {scopes: [environment.apiScope]}, loginFailedRoute: '/login'},
      {interactionType: InteractionType.Redirect, protectedResourceMap: new Map([[protectedUrl, [environment.apiScope]]])}
    )],
  providers: [{provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true}, MsalService, MsalGuard, MsalBroadcastService],
  bootstrap: [AppComponent, MsalRedirectComponent]
})
export class AppModule {}
