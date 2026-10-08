import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MyCommunityDashboard } from './my-community-dashboard';
import { MyCommunityDashboardService } from './my-community-dashboard.service';

describe('MyCommunityDashboard', () => {
  let component: MyCommunityDashboard;
  let fixture: ComponentFixture<MyCommunityDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyCommunityDashboard],
      providers: [
        {
          provide: MyCommunityDashboardService,
          useValue: {
            getAccount: () =>
              of({
                id: 1,
                name: 'Test community',
                iban: 'SK00 1100 0000 0000 0000 0001',
                balance: 0,
                currency: 'EUR',
                payme_url: null,
              }),
            getOrganizations: () => of([{ id: 1, name: 'Test organization' }]),
            getTransactions: () => of([]),
            getGoals: () => of([]),
            getGoal: () =>
              of({
                id: 5,
                account_id: 1,
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
            getMembers: () => of([]),
            getPolls: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyCommunityDashboard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('accountId', 1);
    fixture.componentRef.setInput('communityRole', 'admin');
    fixture.componentRef.setInput('createdByUserId', 7);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens and closes the create-poll form from the admin action', () => {
    const createPollButton = fixture.nativeElement.querySelector(
      '.admin-action:nth-child(3)',
    ) as HTMLButtonElement;

    createPollButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Vytvoriť hlasovanie');

    const backButton = fixture.nativeElement.querySelector(
      'app-create-poll .back-button',
    ) as HTMLButtonElement;
    backButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-create-poll')).toBeNull();
  });

  it('opens an outgoing payment with the organization as payer', () => {
    const paymentButton = fixture.nativeElement.querySelector(
      '.admin-action',
    ) as HTMLButtonElement;
    paymentButton.click();
    fixture.detectChanges();

    const payerSection = fixture.nativeElement.querySelector(
      'app-new-payment .payer-section',
    ) as HTMLElement;
    expect(payerSection.textContent).toContain('Test community');
    expect(payerSection.textContent).toContain(
      'SK00 1100 0000 0000 0000 0001',
    );
  });

  it('opens the create-goal form from the admin action', () => {
    const createGoalButton = fixture.nativeElement.querySelector(
      '.admin-action:nth-child(2)',
    ) as HTMLButtonElement;

    createGoalButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pridať cieľ');

    const backButton = fixture.nativeElement.querySelector(
      'app-create-goal .back-button',
    ) as HTMLButtonElement;
    backButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-create-goal')).toBeNull();
  });

  it('loads and opens a selected goal detail', () => {
    component.goals = [
      {
        id: 5,
        account_id: 1,
        name: 'Spoločná záhrada',
        goal_type: 'temporary',
        target_amount: 2500,
        currency: 'EUR',
        start_date: '2026-01-01',
        end_date: '2027-08-30',
        description: null,
        raised_amount: 0,
        remaining_amount: 2500,
        progress_percentage: 0,
        status: 'in_progress',
      },
    ];
    component.selectedTab = 'goals';
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.goal-card') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-goal-details')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Príprava pôdy a výsadba.');
  });

  it('opens a prefilled contribution payment from the goal details', () => {
    component.goals = [
      {
        id: 5,
        account_id: 1,
        name: 'Spoločná záhrada',
        goal_type: 'temporary',
        target_amount: 2500,
        currency: 'EUR',
        start_date: '2026-01-01',
        end_date: '2027-08-30',
        description: null,
        raised_amount: 0,
        remaining_amount: 2500,
        progress_percentage: 0,
        status: 'in_progress',
      },
    ];
    component.selectedTab = 'goals';
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.goal-card') as HTMLButtonElement).click();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        'app-goal-details .primary-action',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const paymentForm = fixture.nativeElement.querySelector(
      'app-new-payment',
    ) as HTMLElement;
    expect(paymentForm.textContent).toContain('Test organization');
    expect(
      (paymentForm.querySelector('input[name="recipientIban"]') as HTMLInputElement)
        .value,
    ).toBe('SK00 1100 0000 0000 0000 0001');
  });

  it('shows the empty polls state when the community has no polls', () => {
    component.selectedTab = 'votes';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nemáte žiadne prebiehajúce hlasovanie',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Pre spustenie hlasovania sa obráťte na svojho správcu',
    );
  });

  it('shows poll title and closing date for an active poll', () => {
    component.polls = [
      {
        id: 1,
        account_id: 1,
        question: 'Oprava výťahu',
        description: null,
        created_at: '2026-10-01T12:00:00Z',
        closes_at: '2026-10-22T21:59:59Z',
        status: 'open',
        total_votes: 0,
        options: [],
        amount: null,
        details: null,
        attachment_name: null,
        attachment_url: null,
      },
    ];
    component.selectedTab = 'votes';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Oprava výťahu');
    expect(fixture.nativeElement.textContent).toContain('Aktívne do 22. 10. 2026');
    expect(fixture.nativeElement.querySelector('.poll-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.polls-empty')).toBeNull();
  });

  it('opens the poll details for a selected poll', () => {
    component.polls = [
      {
        id: 1,
        account_id: 1,
        question: 'Oprava výťahu',
        description: 'Výmena výťahu v bytovom dome.',
        created_at: '2026-10-01T12:00:00Z',
        closes_at: '2026-10-22T21:59:59Z',
        status: 'open',
        total_votes: 0,
        options: [{ id: 1, label: 'Za', votes: 0 }, { id: 2, label: 'Proti', votes: 0 }],
        amount: '2500.00',
        details: 'Financovanie z fondu opráv.',
        attachment_name: 'ponuka.pdf',
        attachment_url: '/api/polls/1/attachment',
      },
    ];
    component.selectedTab = 'votes';
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.poll-card') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-poll-details')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Výmena výťahu v bytovom dome.');
    expect(fixture.nativeElement.textContent).toContain('ponuka.pdf');
  });
});
