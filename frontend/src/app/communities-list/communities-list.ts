import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { MyCommunityDashboard } from '../my-community-dashboard/my-community-dashboard';
import { MyCommunityInviteScreen } from '../my-community-invite-screen/my-community-invite-screen';
import { CommunitiesListService } from './communities-list.service';
import type { UserAccount } from './communities-list.service';

@Component({
  selector: 'app-communities-list',
  standalone: true,
  imports: [RouterLink, MyCommunityDashboard, MyCommunityInviteScreen],
  templateUrl: './communities-list.html',
  styleUrl: './communities-list.css',
})
export class CommunitiesList implements OnInit {
  private readonly communitiesService = inject(CommunitiesListService);
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  accounts: UserAccount[] = [];
  selectedRole: 'admin' | 'member' = 'admin';
  searchTerm = '';
  loading = true;
  loadError = false;
  promoVisible = true;
  activeCommunity: UserAccount | null = null;
  currentUserId: number | null = null;
  inviteOpen = false;
  private requestedAccountId: number | null = null;
  requestedGoalId: number | null = null;

  get filteredAccounts(): UserAccount[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    const role = this.selectedRole === 'admin' ? 'admin' : null;
    return this.accounts.filter(
      (account) =>
        (role === null ? account.role !== 'admin' : account.role === role) &&
        account.name.toLocaleLowerCase().includes(query),
    );
  }

  ngOnInit(): void {
    const rawUserId = this.route.snapshot.queryParamMap.get('userId');
    const userId = rawUserId === null ? NaN : Number(rawUserId);
    const rawAccountId = this.route.snapshot.queryParamMap.get('accountId');
    const requestedAccountId =
      rawAccountId === null ? null : Number(rawAccountId);
    const rawGoalId = this.route.snapshot.queryParamMap.get('goalId');
    const requestedGoalId = rawGoalId === null ? null : Number(rawGoalId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      this.loading = false;
      this.loadError = true;
      return;
    }
    if (
      requestedAccountId !== null &&
      (!Number.isSafeInteger(requestedAccountId) || requestedAccountId <= 0)
    ) {
      this.loading = false;
      this.loadError = true;
      return;
    }
    if (
      requestedGoalId !== null &&
      (!Number.isSafeInteger(requestedGoalId) || requestedGoalId <= 0)
    ) {
      this.loading = false;
      this.loadError = true;
      return;
    }

    this.currentUserId = userId;
    this.requestedAccountId = requestedAccountId;
    this.requestedGoalId = requestedGoalId;
    this.route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const accountId = Number(params.get('accountId'));
        const goalIdValue = params.get('goalId');
        const goalId = goalIdValue === null ? null : Number(goalIdValue);
        if (
          !Number.isSafeInteger(accountId) ||
          accountId <= 0 ||
          (goalId !== null && (!Number.isSafeInteger(goalId) || goalId <= 0))
        ) {
          return;
        }

        this.requestedAccountId = accountId;
        this.requestedGoalId = goalId;
        const account = this.accounts.find((item) => item.id === accountId);
        if (account) {
          this.activeCommunity = account;
          this.changeDetector.markForCheck();
        }
      });
    this.communitiesService.getUserAccounts(userId).subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        if (this.requestedAccountId !== null) {
          this.activeCommunity =
            accounts.find((account) => account.id === this.requestedAccountId) ?? null;
          if (!this.activeCommunity) {
            console.error(
              `Joined community ${this.requestedAccountId} was not returned for user ${userId}`,
            );
          }
        }
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.changeDetector.markForCheck();
      },
    });
  }

  onSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTerm = event.target.value;
    }
  }

  openCommunity(account: UserAccount): void {
    this.activeCommunity = account;
    this.requestedGoalId = null;
  }

  closeCommunity(): void {
    this.activeCommunity = null;
    this.inviteOpen = false;
  }

  closeInvite(): void {
    this.inviteOpen = false;
  }
}
