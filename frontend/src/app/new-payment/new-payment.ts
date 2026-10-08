import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, input, output } from '@angular/core';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';
import type {
  AccountDetails,
  Transaction,
  TransactionDraft,
} from '../my-community-dashboard/my-community-dashboard.service';

export type PaymentDirection = 'credit' | 'debit';

@Component({
  selector: 'app-new-payment',
  standalone: true,
  imports: [],
  templateUrl: './new-payment.html',
  styleUrl: './new-payment.css',
})
export class NewPayment {
  readonly account = input.required<AccountDetails>();
  readonly communityName = input.required<string>();
  readonly direction = input.required<PaymentDirection>();
  readonly goalId = input<number | null>(null);
  readonly goalName = input('');
  readonly createdByUserId = input<number | null>(null);
  readonly closed = output<void>();
  readonly completed = output<Transaction>();

  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  recipientName = '';
  recipientIban = '';
  amount = '';
  paymentDate = this.today();
  variableSymbol = '';
  specificSymbol = '';
  constantSymbol = '';
  payerReference = '';
  recipientMessage = '';
  submitting = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.direction() === 'credit') {
      this.recipientName = this.communityName();
      this.recipientIban = this.account().iban ?? '';
      this.recipientMessage = this.goalName();
    }
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  get isContribution(): boolean {
    return this.direction() === 'credit';
  }

  onTextInput(
    field:
      | 'recipientName'
      | 'recipientIban'
      | 'amount'
      | 'paymentDate'
      | 'variableSymbol'
      | 'specificSymbol'
      | 'constantSymbol'
      | 'payerReference'
      | 'recipientMessage',
    event: Event,
  ): void {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      this[field] = target.value;
    }
  }

  submit(event?: Event): void {
    event?.preventDefault();
    const amount = Number(this.amount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage = 'Zadajte sumu vyššiu ako 0.';
      return;
    }
    if (!this.paymentDate) {
      this.errorMessage = 'Vyberte dátum splatnosti.';
      return;
    }
    if (!this.recipientName.trim() || !this.recipientIban.trim()) {
      this.errorMessage = 'Vyplňte meno príjemcu a IBAN.';
      return;
    }
    if (!this.isContribution && amount > this.account().balance) {
      this.errorMessage = 'Na účte nie je dostatok prostriedkov.';
      return;
    }

    const draft: TransactionDraft = {
      created_by_user_id: this.createdByUserId(),
      goal_id: this.goalId(),
      date: this.paymentDate,
      amount: amount.toFixed(2),
      currency: this.account().currency,
      counterparty: this.isContribution ? 'Prispievateľ' : this.recipientName.trim(),
      direction: this.direction(),
      payment_type: this.isContribution ? 'Príspevok' : 'SEPA',
      details: this.recipientName.trim(),
      recipient_message: this.recipientMessage.trim(),
      variable_symbol: this.variableSymbol.trim(),
      specific_symbol: this.specificSymbol.trim(),
      constant_symbol: this.constantSymbol.trim(),
      payer_reference: this.payerReference.trim(),
    };

    this.submitting = true;
    this.errorMessage = '';
    this.dashboardService.createTransaction(this.account().id, draft).subscribe({
      next: (transaction) => {
        this.completed.emit(transaction);
        this.closed.emit();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Unable to create community payment', error);
        this.errorMessage =
          error.error?.detail ?? 'Platbu sa nepodarilo potvrdiť. Skúste to znova.';
        this.submitting = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private today(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
