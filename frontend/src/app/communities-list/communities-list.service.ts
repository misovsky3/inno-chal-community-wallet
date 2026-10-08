import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { MembershipRole } from '../community-roles';

export interface UserAccount {
  id: number;
  name: string;
  role: MembershipRole;
}

@Injectable({ providedIn: 'root' })
export class CommunitiesListService {
  private readonly http = inject(HttpClient);

  getUserAccounts(userId: number): Observable<UserAccount[]> {
    return this.http.get<UserAccount[]>(`/api/users/${userId}/accounts`);
  }
}
