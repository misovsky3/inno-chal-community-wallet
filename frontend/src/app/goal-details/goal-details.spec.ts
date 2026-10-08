import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GoalDetails } from './goal-details';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

describe('GoalDetails', () => {
  let component: GoalDetails;
  let fixture: ComponentFixture<GoalDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalDetails],
      providers: [
        {
          provide: MyCommunityDashboardService,
          useValue: {
            getGoal: () =>
              of({
                id: 5,
                account_id: 12,
                name: 'Spoločná záhrada',
                goal_type: 'temporary',
                target_amount: 2500,
                currency: 'EUR',
                start_date: '2026-01-01',
                end_date: '2027-08-30',
                description: 'Príprava pôdy a výsadba.',
                raised_amount: 1840,
                remaining_amount: 660,
                progress_percentage: 73.6,
                status: 'in_progress',
              }),
            getTransactions: () =>
              of([
                {
                  id: 10,
                  account_id: 12,
                  goal_id: 5,
                  date: '2026-10-05',
                  amount: 250,
                  currency: 'EUR',
                  counterparty: 'Peter Novák',
                  direction: 'credit',
                  payment_type: 'Platba',
                  details: null,
                  recipient_message: null,
                  variable_symbol: null,
                  payer_reference: null,
                },
                {
                  id: 11,
                  account_id: 12,
                  goal_id: 6,
                  date: '2026-10-04',
                  amount: 500,
                  currency: 'EUR',
                  counterparty: 'Other goal donor',
                  direction: 'credit',
                  payment_type: 'Platba',
                  details: null,
                  recipient_message: null,
                  variable_symbol: null,
                  payer_reference: null,
                },
              ]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('accountId', 12);
    fixture.componentRef.setInput('goalId', 5);
    fixture.componentRef.setInput('communityName', 'Komunitná záhrada Zelený Dvor');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the values returned by the goal details endpoint', () => {
    expect(fixture.nativeElement.textContent).toContain('Spoločná záhrada');
    expect(fixture.nativeElement.textContent).toContain(component.formatAmount(1840, 'EUR'));
    expect(fixture.nativeElement.textContent).toContain(component.formatAmount(2500, 'EUR'));
    expect(fixture.nativeElement.textContent).toContain('Príprava pôdy a výsadba.');
    expect(fixture.nativeElement.textContent).toContain(
      component.formatEndDate('2027-08-30'),
    );
  });

  it('loads and filters goal movements when the Movements tab is opened', () => {
    const movementsTab = fixture.nativeElement.querySelectorAll(
      '.goal-tabs button',
    )[1] as HTMLButtonElement;
    movementsTab.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Peter Novák');
    expect(fixture.nativeElement.textContent).not.toContain('Other goal donor');
    expect(fixture.nativeElement.textContent).toContain('250,00');
    expect(fixture.nativeElement.textContent).not.toContain('Cieľová suma:');
  });
});
