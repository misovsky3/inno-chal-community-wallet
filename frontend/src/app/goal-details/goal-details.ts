import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';
import type {
  GoalProgress,
  Transaction,
} from '../my-community-dashboard/my-community-dashboard.service';

type GoalDetailsTab = 'goal' | 'movements';

interface GoalMovementGroup {
  key: string;
  label: string;
  transactions: Transaction[];
}

@Component({
  selector: 'app-goal-details',
  standalone: true,
  imports: [],
  templateUrl: './goal-details.html',
  styleUrl: './goal-details.css',
})
export class GoalDetails implements OnInit {
  readonly accountId = input.required<number>();
  readonly goalId = input.required<number>();
  readonly communityName = input.required<string>();
  readonly closed = output<void>();
  readonly contributeRequested = output<void>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  goal: GoalProgress | null = null;
  movements: Transaction[] = [];
  selectedTab: GoalDetailsTab = 'goal';
  loading = true;
  loadError = false;
  movementsLoading = false;
  movementsLoadError = false;
  private movementsLoaded = false;

  get movementGroups(): GoalMovementGroup[] {
    const grouped = new Map<string, Transaction[]>();
    for (const movement of this.movements) {
      const month = movement.date.slice(0, 7);
      const monthMovements = grouped.get(month) ?? [];
      monthMovements.push(movement);
      grouped.set(month, monthMovements);
    }

    return [...grouped.entries()].map(([month, transactions], index) => ({
      key: month,
      label: index === 0 ? 'Aktuálny cyklus' : this.formatMonthRange(month),
      transactions,
    }));
  }

  ngOnInit(): void {
    this.dashboardService.getGoal(this.accountId(), this.goalId()).subscribe({
      next: (goal) => {
        this.goal = goal;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to load goal details', error);
        this.loading = false;
        this.loadError = true;
        this.changeDetector.markForCheck();
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  formatAmount(amount: number, currency: string): string {
    return `${new Intl.NumberFormat('sk-SK', {
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`;
  }

  formatMovementAmount(amount: number): string {
    return new Intl.NumberFormat('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  }

  formatProgress(amount: number): string {
    return new Intl.NumberFormat('sk-SK', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  }

  formatEndDate(endDate: string | null): string {
    if (!endDate) {
      return 'Bez dátumu ukončenia';
    }

    const [year, month, day] = endDate.split('-');
    return `${day}.${month}.${year}`;
  }

  statusLabel(status: GoalProgress['status']): string {
    return status === 'in_progress'
      ? 'Aktívne'
      : status === 'completed'
        ? 'Dokončené'
        : 'Ukončené';
  }

  selectTab(tab: GoalDetailsTab): void {
    this.selectedTab = tab;
    if (tab === 'movements' && !this.movementsLoaded && !this.movementsLoading) {
      this.loadMovements();
    }
  }

  private loadMovements(): void {
    this.movementsLoading = true;
    this.movementsLoadError = false;
    this.dashboardService.getTransactions(this.accountId()).subscribe({
      next: (transactions) => {
        this.movements = transactions
          .filter(
            (transaction) =>
              transaction.goal_id === this.goalId() &&
              transaction.direction === 'credit',
          )
          .sort(
            (left, right) =>
              right.date.localeCompare(left.date) || right.id - left.id,
          );
        this.movementsLoaded = true;
        this.movementsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to load goal movements', error);
        this.movementsLoading = false;
        this.movementsLoadError = true;
        this.changeDetector.markForCheck();
      },
    });
  }

  private formatMonthRange(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 0);
    const dateFormat = new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${dateFormat.format(start)} - ${dateFormat.format(end)}`;
  }
}
