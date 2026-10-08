import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output } from '@angular/core';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

@Component({
  selector: 'app-create-poll',
  standalone: true,
  imports: [],
  templateUrl: './create-poll.html',
  styleUrl: './create-poll.css',
})
export class CreatePoll {
  readonly communityName = input.required<string>();
  readonly accountId = input.required<number>();
  readonly createdByUserId = input.required<number | null>();
  readonly closed = output<void>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  question = '';
  description = '';
  closesAt = '';
  amount = '';
  details = '';
  attachment: File | null = null;
  submitting = false;
  errorMessage = '';

  readonly minimumDate = this.getLocalDate();

  inputValue(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
      ? event.target.value
      : '';
  }

  onAttachmentChange(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.attachment = event.target.files?.item(0) ?? null;
    }
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const createdByUserId = this.createdByUserId();
    if (createdByUserId === null || createdByUserId <= 0) {
      this.errorMessage = 'Používateľa sa nepodarilo overiť. Skúste to znova.';
      return;
    }

    this.errorMessage = '';
    this.submitting = true;
    const closesAt = new Date(`${this.closesAt}T23:59:59`).toISOString();
    this.dashboardService
      .createPollProposal(this.accountId(), createdByUserId, {
        question: this.question.trim(),
        description: this.description.trim(),
        closesAt,
        amount: this.amount,
        details: this.details.trim(),
        attachment: this.attachment,
      })
      .subscribe({
        next: () => this.closed.emit(),
        error: (error: HttpErrorResponse) => {
          console.error('Unable to create poll proposal', error);
          this.submitting = false;
          this.errorMessage = this.errorMessageFor(error);
        },
      });
  }

  private errorMessageFor(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'Hlasovanie môže vytvoriť iba správca komunity.';
    }
    if (error.status === 413) {
      return 'Priložený PDF súbor je príliš veľký (maximum je 5 MB).';
    }
    if (error.status === 422) {
      return 'Skontrolujte zadané údaje a prílohu PDF.';
    }
    return 'Hlasovanie sa nepodarilo spustiť. Skúste to znova.';
  }

  private getLocalDate(): string {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
