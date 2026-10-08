import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { InvitationRole, MembershipRole } from '../community-roles';

export interface AccountDetails {
  id: number;
  name: string;
  iban: string | null;
  balance: number;
  currency: string;
  payme_url: string | null;
}

export interface Organization {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  goal_id: number | null;
  date: string;
  amount: number;
  currency: string;
  counterparty: string;
  direction: 'credit' | 'debit';
  payment_type: string;
  details: string | null;
  recipient_message: string | null;
  variable_symbol: string | null;
  payer_reference: string | null;
}

export interface GoalProgress {
  id: number;
  account_id: number;
  name: string;
  goal_type: 'permanent' | 'temporary';
  target_amount: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  raised_amount: number;
  remaining_amount: number;
  progress_percentage: number;
  status: 'in_progress' | 'completed' | 'expired';
}

export interface AccountMember {
  id: number;
  name: string;
  email: string;
  role: MembershipRole;
}

export interface InvitationInfo {
  token: string;
  account_id: number;
  role: InvitationRole;
  expires_at: string;
  uses_remaining: number;
  invite_path: string;
}

export interface InvitationJoinResult {
  account_id: number;
  user_id: number;
  role: InvitationRole;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MyCommunityDashboardService {
  private readonly http = inject(HttpClient);
  private readonly accountsEndpoint = '/api/accounts';

  getAccount(accountId: number): Observable<AccountDetails> {
    return this.http.get<AccountDetails>(`${this.accountsEndpoint}/${accountId}`);
  }

  getOrganizations(accountId: number): Observable<Organization[]> {
    return this.http.get<Organization[]>(
      `${this.accountsEndpoint}/${accountId}/organizations`,
    );
  }

  getTransactions(accountId: number): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(
      `${this.accountsEndpoint}/${accountId}/transactions`,
    );
  }

  getGoals(accountId: number): Observable<GoalProgress[]> {
    return this.http.get<GoalProgress[]>(
      `${this.accountsEndpoint}/${accountId}/goals`,
    );
  }

  getMembers(accountId: number): Observable<AccountMember[]> {
    return this.http.get<AccountMember[]>(
      `${this.accountsEndpoint}/${accountId}/members`,
    );
  }

  createInvitation(
    accountId: number,
    createdByUserId: number,
    role: InvitationRole,
  ): Observable<InvitationInfo> {
    return this.http.post<InvitationInfo>(
      `${this.accountsEndpoint}/${accountId}/invitations`,
      { created_by_user_id: createdByUserId, role },
    );
  }

  getInvitation(token: string): Observable<InvitationInfo> {
    return this.http.get<InvitationInfo>(
      `/api/invitations/${encodeURIComponent(token)}`,
    );
  }

  acceptInvitation(
    token: string,
    userId: number,
  ): Observable<InvitationJoinResult> {
    return this.http.post<InvitationJoinResult>(
      `/api/invitations/${encodeURIComponent(token)}/accept`,
      { user_id: userId },
    );
  }
}
