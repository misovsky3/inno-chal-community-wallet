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
  specific_symbol?: string | null;
  constant_symbol?: string | null;
  payer_reference: string | null;
}

export interface TransactionDraft {
  created_by_user_id: number | null;
  goal_id: number | null;
  date: string;
  amount: string;
  currency: string;
  counterparty: string;
  direction: 'credit' | 'debit';
  payment_type: string;
  details: string;
  recipient_message: string;
  variable_symbol: string;
  specific_symbol: string;
  constant_symbol: string;
  payer_reference: string;
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

export interface UserNotification {
  id: number;
  created_by_user_id: number;
  recipient_user_id: number;
  account_id: number | null;
  notification_type: string;
  title: string;
  message: string;
  target_path: string | null;
  created_at: string;
  read_at: string | null;
  status: 'new' | 'read';
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

export interface PollProposalDraft {
  question: string;
  description: string;
  closesAt: string;
  amount: string;
  details: string;
  attachment: File | null;
}

export interface PollResult {
  id: number;
  account_id: number;
  question: string;
  description: string | null;
  created_at: string;
  closes_at: string;
  status: 'open' | 'closed';
  total_votes: number;
  options: { id: number; label: string; votes: number }[];
  amount: string | null;
  details: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  user_has_voted?: boolean;
}

export interface GoalDraft {
  name: string;
  description: string;
  targetAmount: string;
  endDate: string;
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

  createTransaction(
    accountId: number,
    draft: TransactionDraft,
  ): Observable<Transaction> {
    return this.http.post<Transaction>(
      `${this.accountsEndpoint}/${accountId}/transactions`,
      draft,
    );
  }

  getGoals(accountId: number): Observable<GoalProgress[]> {
    return this.http.get<GoalProgress[]>(
      `${this.accountsEndpoint}/${accountId}/goals`,
    );
  }

  getGoal(accountId: number, goalId: number): Observable<GoalProgress> {
    return this.http.get<GoalProgress>(
      `${this.accountsEndpoint}/${accountId}/goals/${goalId}`,
    );
  }

  getUserNotifications(userId: number): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(
      `/api/users/${userId}/notifications`,
      { params: { status: 'new' } },
    );
  }

  markNotificationRead(
    notificationId: number,
    userId: number,
  ): Observable<UserNotification> {
    return this.http.post<UserNotification>(
      `/api/notifications/${notificationId}/read`,
      { user_id: userId },
    );
  }

  createGoal(
    accountId: number,
    createdByUserId: number,
    draft: GoalDraft,
  ): Observable<GoalProgress> {
    return this.http.post<GoalProgress>(
      `${this.accountsEndpoint}/${accountId}/goals`,
      {
        created_by_user_id: createdByUserId,
        name: draft.name,
        description: draft.description,
        target_amount: draft.targetAmount,
        end_date: draft.endDate,
      },
    );
  }

  getMembers(accountId: number): Observable<AccountMember[]> {
    return this.http.get<AccountMember[]>(
      `${this.accountsEndpoint}/${accountId}/members`,
    );
  }

  getPolls(accountId: number, userId?: number): Observable<PollResult[]> {
    const url = `${this.accountsEndpoint}/${accountId}/polls`;
    return userId === undefined
      ? this.http.get<PollResult[]>(url)
      : this.http.get<PollResult[]>(url, { params: { user_id: userId } });
  }

  castPollVote(
    pollId: number,
    userId: number,
    optionId: number,
  ): Observable<PollResult> {
    return this.http.post<PollResult>(`/api/polls/${pollId}/votes`, {
      user_id: userId,
      option_id: optionId,
    });
  }

  createPollProposal(
    accountId: number,
    createdByUserId: number,
    draft: PollProposalDraft,
  ): Observable<PollResult> {
    const formData = new FormData();
    formData.append('created_by_user_id', String(createdByUserId));
    formData.append('question', draft.question);
    formData.append('description', draft.description);
    formData.append('closes_at', draft.closesAt);
    formData.append('amount', draft.amount);
    formData.append('details', draft.details);
    if (draft.attachment) {
      formData.append('attachment', draft.attachment, draft.attachment.name);
    }

    return this.http.post<PollResult>(
      `${this.accountsEndpoint}/${accountId}/polls/proposals`,
      formData,
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
