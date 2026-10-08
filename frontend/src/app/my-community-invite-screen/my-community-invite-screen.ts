import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import QRCode from 'qrcode';
import type { InvitationRole } from '../community-roles';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

interface RoleOption {
  role: InvitationRole;
  label: string;
  description: string;
}

@Component({
  selector: 'app-my-community-invite-screen',
  standalone: true,
  templateUrl: './my-community-invite-screen.html',
  styleUrl: './my-community-invite-screen.css',
})
export class MyCommunityInviteScreen {
  readonly accountId = input.required<number>();
  readonly communityName = input.required<string>();
  readonly createdByUserId = input.required<number>();
  readonly closed = output<void>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly roles: RoleOption[] = [
    {
      role: 'disponent',
      label: 'Disponent',
      description: 'oprávnený zadávať a schvaľovať platby',
    },
    {
      role: 'payment_preparer',
      label: 'Pripravovateľ platieb',
      description: 'môže vytvárať platby na schválenie',
    },
    {
      role: 'controller',
      label: 'Kontrolór',
      description: 'dohľad nad pohybmi a dokumentmi',
    },
    {
      role: 'read_only',
      label: 'Člen s náhľadom',
      description: 'iba zobrazenie informácií',
    },
  ];

  selectedRole: InvitationRole | null = null;
  sheetSelectedRole: InvitationRole = 'read_only';
  roleSheetOpen = false;
  generating = false;
  inviteUrl: string | null = null;
  qrCodeDataUrl: string | null = null;
  actionError: string | null = null;
  shareMessage: string | null = null;

  get selectedRoleLabel(): string {
    return (
      this.roles.find((option) => option.role === this.selectedRole)?.label ??
      'Vybrať'
    );
  }

  openRoleSheet(): void {
    this.sheetSelectedRole = this.selectedRole ?? 'read_only';
    this.roleSheetOpen = true;
  }

  cancelRoleSheet(): void {
    this.roleSheetOpen = false;
  }

  selectRole(role: InvitationRole): void {
    this.selectedRole = role;
    this.roleSheetOpen = false;
    this.actionError = null;
  }

  generateQrCode(): void {
    if (this.generating) {
      return;
    }
    if (this.selectedRole === null) {
      this.openRoleSheet();
      return;
    }

    this.generating = true;
    this.actionError = null;
    this.shareMessage = null;
    this.dashboardService
      .createInvitation(
        this.accountId(),
        this.createdByUserId(),
        this.selectedRole,
      )
      .subscribe({
        next: (invitation) => {
        const invitePath = invitation.invite_path.replace(/^\/+/, '');
        const url = new URL(invitePath, document.baseURI).toString();
          this.inviteUrl = url;
          this.changeDetector.markForCheck();
          QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 280,
          })
          .then((dataUrl) => {
            this.qrCodeDataUrl = dataUrl;
              this.generating = false;
              this.changeDetector.markForCheck();
            })
            .catch(() => {
              this.generating = false;
              this.actionError =
                'Pozvánka sa vytvorila, ale QR kód sa nepodarilo vygenerovať.';
              this.changeDetector.markForCheck();
            });
        },
        error: (error: HttpErrorResponse) => {
          this.generating = false;
          this.actionError = this.invitationErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  async shareQrCode(): Promise<void> {
    if (!this.inviteUrl || !this.qrCodeDataUrl) {
      return;
    }

    this.actionError = null;
    this.shareMessage = null;
    try {
      if (typeof navigator.share === 'function') {
        const imageBlob = await fetch(this.qrCodeDataUrl).then((response) =>
          response.blob(),
        );
        const imageFile = new File([imageBlob], 'community-invitation.png', {
          type: imageBlob.type,
        });
        const shareData: ShareData = {
          title: `Pozvánka do komunity ${this.communityName()}`,
          text: 'Pripojte sa ku komunitnej záhrade.',
          url: this.inviteUrl,
        };
        if (navigator.canShare?.({ files: [imageFile] })) {
          shareData.files = [imageFile];
        }
        await navigator.share({
          ...shareData,
        });
        this.changeDetector.markForCheck();
        return;
      }
      if (!navigator.clipboard) {
        this.actionError = 'Zdieľanie nie je na tomto zariadení dostupné.';
        this.changeDetector.markForCheck();
        return;
      }
      await navigator.clipboard.writeText(this.inviteUrl);
      this.shareMessage = 'Odkaz na pozvánku bol skopírovaný.';
      this.changeDetector.markForCheck();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.actionError = 'Pozvánku sa nepodarilo zdieľať.';
      this.changeDetector.markForCheck();
    }
  }

  private invitationErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'Pozvánku môže vytvoriť iba správca komunity.';
    }
    if (error.status === 404) {
      return 'Komunitu alebo používateľa sa nepodarilo nájsť.';
    }
    return 'Pozvánku sa nepodarilo vytvoriť. Skúste to znova.';
  }
}
