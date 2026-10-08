import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  accounts: UserAccount[] = [];
  selectedRole: 'admin' | 'member' = 'admin';
  searchTerm = '';
  loading = true;
  loadError = false;
  promoVisible = true;
  activeCommunity: UserAccount | null = null;
  currentUserId: number | null = null;
  inviteOpen = false;

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

    this.currentUserId = userId;
    this.communitiesService.getUserAccounts(userId).subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        if (requestedAccountId !== null) {
          this.activeCommunity =
            accounts.find((account) => account.id === requestedAccountId) ?? null;
          if (!this.activeCommunity) {
            console.error(
              `Joined community ${requestedAccountId} was not returned for user ${userId}`,
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
  }

  closeCommunity(): void {
    this.activeCommunity = null;
    this.inviteOpen = false;
  }

  closeInvite(): void {
    this.inviteOpen = false;
  }
}
