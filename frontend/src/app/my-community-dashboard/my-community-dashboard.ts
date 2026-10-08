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
import { forkJoin } from 'rxjs';
import type { MembershipRole } from '../community-roles';
import { CreateGoal } from '../create-goal/create-goal';
import { CreatePoll } from '../create-poll/create-poll';
import { FunctionUnavailable } from '../function-unavailable/function-unavailable';
import { GoalDetails } from '../goal-details/goal-details';
import { NewPayment, type PaymentDirection } from '../new-payment/new-payment';
import { PollDetails } from '../poll-details/poll-details';
import {
  MyCommunityDashboardService,
  type AccountDetails,
  type AccountMember,
  type GoalProgress,
  type Organization,
  type PollResult,
  type Transaction,
} from './my-community-dashboard.service';

type DashboardTab = 'payments' | 'goals' | 'votes' | 'members';

interface TransactionGroup {
  key: string;
  label: string;
  transactions: Transaction[];
}

interface MemberGroup {
  role: MembershipRole;
  label: string;
  members: AccountMember[];
}

@Component({
  selector: 'app-my-community-dashboard',
  standalone: true,
  imports: [
    CreateGoal,
    CreatePoll,
    FunctionUnavailable,
    GoalDetails,
    NewPayment,
    PollDetails,
  ],
  templateUrl: './my-community-dashboard.html',
  styleUrl: './my-community-dashboard.css',
})
export class MyCommunityDashboard implements OnInit {
  readonly accountId = input.required<number>();
  readonly communityRole = input.required<MembershipRole>();
  readonly createdByUserId = input.required<number | null>();
  readonly initialGoalId = input<number | null>(null);
  readonly closed = output<void>();
  readonly addMemberRequested = output<void>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  account: AccountDetails | null = null;
  organizations: Organization[] = [];
  transactions: Transaction[] = [];
  goals: GoalProgress[] = [];
  members: AccountMember[] = [];
  polls: PollResult[] = [];
  selectedTab: DashboardTab = 'payments';
  searchTerm = '';
  memberSearchTerm = '';
  loading = true;
  loadError = false;
  functionUnavailableOpen = false;
  createPollOpen = false;
  createGoalOpen = false;
  paymentDirection: PaymentDirection | null = null;
  paymentGoalId: number | null = null;
  selectedGoalId: number | null = null;
  selectedPoll: PollResult | null = null;

  get communityHeading(): string {
    const role = this.communityRole() === 'admin' ? 'Správca' : 'Člen';
    return `${role} ${this.organizations[0]?.name ?? this.account?.name ?? ''}`.trim();
  }

  get paymentGoalName(): string {
    return this.goals.find((goal) => goal.id === this.paymentGoalId)?.name ?? '';
  }

  get transactionGroups(): TransactionGroup[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    const grouped = new Map<string, Transaction[]>();
    for (const transaction of this.transactions) {
      const searchableText = [
        transaction.counterparty,
        transaction.details,
        transaction.recipient_message,
        transaction.payment_type,
      ]
        .filter((value): value is string => value !== null)
        .join(' ')
        .toLocaleLowerCase();
      if (query && !searchableText.includes(query)) {
        continue;
      }

      const month = transaction.date.slice(0, 7);
      const monthTransactions = grouped.get(month) ?? [];
      monthTransactions.push(transaction);
      grouped.set(month, monthTransactions);
    }

    return [...grouped.entries()].map(([month, transactions], index) => ({
      key: month,
      label: index === 0 ? 'Aktuálny cyklus' : this.formatMonthRange(month),
      transactions,
    }));
  }

  get memberGroups(): MemberGroup[] {
    const query = this.memberSearchTerm.trim().toLocaleLowerCase();
    const filteredMembers = this.members.filter((member) =>
      [member.name, member.email].some((value) =>
        value.toLocaleLowerCase().includes(query),
      ),
    );
    const groups: MemberGroup[] = [
      { role: 'admin', label: 'SPRÁVCA', members: [] },
      { role: 'disponent', label: 'DISPONENT', members: [] },
      {
        role: 'payment_preparer',
        label: 'PRIPRAVOVATEĽ PLATIEB',
        members: [],
      },
      { role: 'controller', label: 'KONTROLÓR', members: [] },
      { role: 'read_only', label: 'ČLENOVIA S NÁHĽADOM', members: [] },
    ];
    for (const member of filteredMembers) {
      groups.find((group) => group.role === member.role)?.members.push(member);
    }
    return groups.filter((group) => group.members.length > 0);
  }

  ngOnInit(): void {
    forkJoin({
      account: this.dashboardService.getAccount(this.accountId()),
      organizations: this.dashboardService.getOrganizations(this.accountId()),
      transactions: this.dashboardService.getTransactions(this.accountId()),
      goals: this.dashboardService.getGoals(this.accountId()),
      members: this.dashboardService.getMembers(this.accountId()),
      polls: this.dashboardService.getPolls(
        this.accountId(),
        this.createdByUserId() ?? undefined,
      ),
    }).subscribe({
      next: (data) => {
        this.account = data.account;
        this.organizations = data.organizations;
        this.transactions = data.transactions;
        this.goals = data.goals;
        this.members = data.members;
        this.polls = data.polls;
        this.selectedGoalId = this.initialGoalId();
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.loadError = true;
        this.changeDetector.markForCheck();
        console.error('Unable to load community dashboard', error);
      },
    });
  }

  ngOnChanges(): void {
    this.selectedGoalId = this.initialGoalId();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.paymentDirection !== null) {
      this.closePayment();
      return;
    }
    if (this.selectedGoalId !== null) {
      this.closeGoalDetails();
      return;
    }
    if (this.selectedPoll) {
      this.closePollDetails();
      return;
    }
    this.closed.emit();
  }

  onSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTerm = event.target.value;
    }
  }

  onMemberSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.memberSearchTerm = event.target.value;
    }
  }

  showUnavailable(): void {
    this.functionUnavailableOpen = true;
  }

  openCreatePoll(): void {
    this.createPollOpen = true;
  }

  openCreateGoal(): void {
    this.createGoalOpen = true;
  }

  openPayment(direction: PaymentDirection, goalId: number | null = null): void {
    this.paymentDirection = direction;
    this.paymentGoalId = goalId;
  }

  closePayment(): void {
    this.paymentDirection = null;
    this.paymentGoalId = null;
  }

  onPaymentCompleted(): void {
    this.refreshPaymentsAndGoals();
  }

  onContributionRequested(): void {
    const goalId = this.selectedGoalId;
    this.closeGoalDetails();
    this.openPayment('credit', goalId);
  }

  private refreshPaymentsAndGoals(): void {
    forkJoin({
      account: this.dashboardService.getAccount(this.accountId()),
      transactions: this.dashboardService.getTransactions(this.accountId()),
      goals: this.dashboardService.getGoals(this.accountId()),
    }).subscribe({
      next: (data) => {
        this.account = data.account;
        this.transactions = data.transactions;
        this.goals = data.goals;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to refresh community payments', error);
      },
    });
  }

  closeCreateGoal(): void {
    this.createGoalOpen = false;
    this.dashboardService.getGoals(this.accountId()).subscribe({
      next: (goals) => {
        this.goals = goals;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to load community goals', error);
      },
    });
  }

  closeCreatePoll(): void {
    this.createPollOpen = false;
    this.dashboardService
      .getPolls(this.accountId(), this.createdByUserId() ?? undefined)
      .subscribe({
      next: (polls) => {
        this.polls = polls;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to load community polls', error);
      },
    });
  }

  closeUnavailable(): void {
    this.functionUnavailableOpen = false;
  }

  openPollDetails(poll: PollResult): void {
    this.selectedPoll = poll;
  }

  openGoalDetails(goal: GoalProgress): void {
    this.selectedGoalId = goal.id;
  }

  closeGoalDetails(): void {
    this.selectedGoalId = null;
  }

  closePollDetails(): void {
    this.selectedPoll = null;
  }

  updatePoll(poll: PollResult): void {
    this.polls = this.polls.map((currentPoll) =>
      currentPoll.id === poll.id ? poll : currentPoll,
    );
    this.selectedPoll = poll;
  }

  memberInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase();
  }

  formatMoney(amount: number, currency = this.account?.currency ?? 'EUR'): string {
    return `${new Intl.NumberFormat('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`;
  }

  formatGoalAmount(amount: number, currency: string): string {
    return `${new Intl.NumberFormat('sk-SK', {
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`;
  }

  formatPollClosingDate(closesAt: string): string {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Bratislava',
    }).format(new Date(closesAt));
  }

  goalRemainingTime(goal: GoalProgress): string | null {
    if (goal.status !== 'in_progress' || !goal.end_date) {
      return null;
    }

    const [year, month] = goal.end_date.split('-').map(Number);
    const today = new Date();
    const monthsRemaining =
      (year - today.getFullYear()) * 12 + month - (today.getMonth() + 1);
    if (monthsRemaining <= 0) {
      return null;
    }

    const unit =
      monthsRemaining === 1
        ? 'mesiac'
        : monthsRemaining < 5
          ? 'mesiace'
          : 'mesiacov';
    return `Ostáva ${monthsRemaining} ${unit}`;
  }

  formatTransactionAmount(transaction: Transaction): string {
    const amount = Math.abs(transaction.amount);
    const sign = transaction.direction === 'debit' ? '−' : '';
    return `${sign}${this.formatMoney(amount, transaction.currency)}`;
  }

  transactionTitle(transaction: Transaction): string {
    return transaction.counterparty || transaction.payment_type;
  }

  transactionDetail(transaction: Transaction): string | null {
    return transaction.details && transaction.details !== transaction.counterparty
      ? transaction.details
      : transaction.recipient_message;
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
