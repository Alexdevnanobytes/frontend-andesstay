import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { Role } from './models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private readonly session: SessionService, private readonly router: Router) {}
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const roles = route.data['roles'] as Role[];
    return this.session.ensure().pipe(
      map(profile => profile.roles.some(role => roles.includes(role)) ? true : this.router.parseUrl('/dashboard')),
      catchError(() => of(this.router.parseUrl('/login')))
    );
  }
}
