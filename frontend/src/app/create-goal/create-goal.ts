import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output } from '@angular/core';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

@Component({
  selector: 'app-create-goal',
  standalone: true,
  imports: [],
  templateUrl: './create-goal.html',
  styleUrl: './create-goal.css',
})
export class CreateGoal {
  readonly communityName = input.required<string>();
  readonly accountId = input.required<number>();
  readonly createdByUserId = input.required<number | null>();
  readonly currency = input.required<string>();
  readonly closed = output<void>();

  private readonly dashboardService = inject(MyCommunityDashboardService);

  name = '';
  description = '';
  targetAmount = '';
  endDate = '';
  submitting = false;
  errorMessage = '';

  readonly minimumDate = this.getLocalDate();

  inputValue(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
      ? event.target.value
      : '';
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
    this.dashboardService
      .createGoal(this.accountId(), createdByUserId, {
        name: this.name.trim(),
        description: this.description.trim(),
        targetAmount: this.targetAmount,
        endDate: this.endDate,
      })
      .subscribe({
        next: () => this.closed.emit(),
        error: (error: HttpErrorResponse) => {
          console.error('Unable to create goal', error);
          this.submitting = false;
          this.errorMessage = this.errorMessageFor(error);
        },
      });
  }

  private errorMessageFor(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'Cieľ môže vytvoriť iba správca komunity.';
    }
    if (error.status === 422) {
      return 'Skontrolujte zadané údaje a dátum ukončenia cieľa.';
    }
    return 'Cieľ sa nepodarilo vytvoriť. Skúste to znova.';
  }

  private getLocalDate(): string {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
