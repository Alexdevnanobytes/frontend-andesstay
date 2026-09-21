import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Profile, Role } from './models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  profile: Profile | null = null;
  constructor(private readonly api: ApiService) {}
  ensure(): Observable<Profile> {
    return this.profile ? of(this.profile) : this.api.me().pipe(tap(profile => this.profile = profile));
  }
  refresh(): Observable<Profile> { this.profile = null; return this.ensure(); }
  has(...roles: Role[]): boolean { return this.profile?.roles.some(role => roles.includes(role)) ?? false; }
  clear(): void { this.profile = null; }
}
