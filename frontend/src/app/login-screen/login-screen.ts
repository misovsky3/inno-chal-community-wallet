import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { FaceidSpinner } from '../faceid-spinner/faceid-spinner';
import { JoinCommunityModal } from '../join-community-modal/join-community-modal';
import type { InvitationJoinResult } from '../my-community-dashboard/my-community-dashboard.service';
import { UsersService } from '../users.service';
import type { User } from '../users.service';

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [FaceidSpinner, JoinCommunityModal, RouterLink],
  templateUrl: './login-screen.html',
  styleUrl: './login-screen.css',
})
export class LoginScreen implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly usersService = inject(UsersService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  users: User[] = [];
  selectedUserId: number | null = null;
  loadingUsers = true;
  loadError = false;
  authenticating = false;
  invitationToken: string | null = null;
  joinModalOpen = false;

  ngOnInit(): void {
    this.invitationToken = this.route.snapshot.paramMap.get('token');
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.selectedUserId = users[0]?.id ?? null;
        this.loadingUsers = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loadingUsers = false;
        this.loadError = true;
        this.changeDetector.markForCheck();
      },
    });
  }

  onUserChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      const userId = Number(target.value);
      this.selectedUserId = this.users.some((user) => user.id === userId)
        ? userId
        : null;
    }
  }

  login(): void {
    if (this.authenticating || this.selectedUserId === null) {
      return;
    }

    this.authenticating = true;
    const userId = this.selectedUserId;
    timer(1800)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.authenticating = false;
        if (this.invitationToken) {
          this.joinModalOpen = true;
          this.changeDetector.markForCheck();
        } else {
          void this.router.navigate(['/dashboard'], {
            queryParams: { userId },
          });
        }
      });
  }

  onInvitationJoined(result: InvitationJoinResult): void {
    void this.router.navigate(['/communities-list'], {
      queryParams: {
        userId: result.user_id,
        accountId: result.account_id,
      },
    });
  }

}
