import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, output } from '@angular/core';
import type { PollResult } from '../my-community-dashboard/my-community-dashboard.service';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

@Component({
  selector: 'app-poll-details',
  standalone: true,
  imports: [],
  templateUrl: './poll-details.html',
  styleUrl: './poll-details.css',
})
export class PollDetails implements OnInit {
  readonly poll = input.required<PollResult>();
  readonly communityName = input.required<string>();
  readonly userId = input.required<number | null>();
  readonly closed = output<void>();
  readonly updated = output<PollResult>();

  private readonly dashboardService = inject(MyCommunityDashboardService);

  selectedOptionId: number | null = null;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  alreadyVoted = false;

  get hasVoted(): boolean {
    return this.alreadyVoted || this.poll().user_has_voted === true;
  }

  ngOnInit(): void {
    this.alreadyVoted = this.poll().user_has_voted === true;
  }

  optionProgress(optionVotes: number): number {
    const totalVotes = this.poll().total_votes;
    return totalVotes === 0 ? 0 : Math.round((optionVotes / totalVotes) * 100);
  }

  formatClosingDate(closesAt: string): string {
    const date = new Date(closesAt);
    const datePart = new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Bratislava',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/Bratislava',
    }).format(date);
    return `${datePart} o ${timePart}`;
  }

  formatAmount(amount: string): string {
    return `${new Intl.NumberFormat('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount))} EUR`;
  }

  selectOption(optionId: number): void {
    this.selectedOptionId = optionId;
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitVote(event: SubmitEvent): void {
    event.preventDefault();
    if (this.hasVoted) {
      this.errorMessage = 'V tomto hlasovaní ste už hlasovali.';
      return;
    }

    const userId = this.userId();
    const optionId = this.selectedOptionId;
    if (userId === null || !Number.isSafeInteger(userId) || userId <= 0) {
      this.errorMessage = 'Používateľa sa nepodarilo overiť. Skúste to znova.';
      return;
    }
    if (optionId === null || this.poll().status !== 'open') {
      this.errorMessage = 'Vyberte možnosť v aktívnom hlasovaní.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.submitting = true;
    this.dashboardService
      .castPollVote(this.poll().id, userId, optionId)
      .subscribe({
        next: (poll) => {
          this.submitting = false;
          this.alreadyVoted = true;
          this.successMessage = 'Váš hlas bol odoslaný.';
          this.updated.emit(poll);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Unable to submit poll vote', error);
          this.submitting = false;
          this.errorMessage = this.errorMessageFor(error);
        },
      });
  }

  private errorMessageFor(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'Hlasovať môžu iba členovia komunity.';
    }
    if (error.status === 409) {
      if (error.error?.detail === 'User has already voted in this poll') {
        this.alreadyVoted = true;
        return 'V tomto hlasovaní ste už hlasovali.';
      }
      return 'Toto hlasovanie je už ukončené.';
    }
    if (error.status === 422) {
      return 'Vybraná možnosť nie je platná.';
    }
    return 'Hlas sa nepodarilo odoslať. Skúste to znova.';
  }
}
