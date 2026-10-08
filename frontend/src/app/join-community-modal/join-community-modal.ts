import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, input, output } from '@angular/core';
import {
  MyCommunityDashboardService,
  type AccountDetails,
  type InvitationInfo,
  type InvitationJoinResult,
} from '../my-community-dashboard/my-community-dashboard.service';

@Component({
  selector: 'app-join-community-modal',
  standalone: true,
  imports: [],
  templateUrl: './join-community-modal.html',
  styleUrl: './join-community-modal.css',
})
export class JoinCommunityModal {
  readonly token = input.required<string>();
  readonly userId = input.required<number>();
  readonly declined = output<void>();
  readonly joined = output<InvitationJoinResult>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  invitation: InvitationInfo | null = null;
  community: AccountDetails | null = null;
  loading = true;
  joining = false;
  loadError: string | null = null;
  joinError: string | null = null;

  get invitationRoleLabel(): string {
    switch (this.invitation?.role) {
      case 'disponent':
        return 'Disponent';
      case 'payment_preparer':
        return 'Pripravovateľ platieb';
      case 'controller':
        return 'Kontrolór';
      case 'read_only':
        return 'Člen s náhľadom';
      default:
        return '';
    }
  }

  ngOnInit(): void {
    this.dashboardService.getInvitation(this.token()).subscribe({
      next: (invitation) => {
        this.invitation = invitation;
        this.dashboardService.getAccount(invitation.account_id).subscribe({
          next: (community) => {
            this.community = community;
            this.loading = false;
            this.changeDetector.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.loadError = 'Údaje o komunite sa nepodarilo načítať.';
            this.changeDetector.markForCheck();
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.loadError =
          error.status === 410
            ? 'Táto pozvánka už nie je platná.'
            : 'Pozvánku sa nepodarilo načítať.';
        this.changeDetector.markForCheck();
      },
    });
  }

  accept(): void {
    if (!this.invitation || this.joining || this.loading || this.loadError) {
      return;
    }

    this.joining = true;
    this.joinError = null;
    this.dashboardService
      .acceptInvitation(this.token(), this.userId())
      .subscribe({
        next: (result) => this.joined.emit(result),
        error: (error: HttpErrorResponse) => {
          this.joining = false;
          this.joinError =
            error.status === 409
              ? 'Už ste členom tejto komunity.'
              : error.status === 410
                ? 'Táto pozvánka už nie je platná.'
                : 'Pripojenie ku komunite sa nepodarilo. Skúste to znova.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
