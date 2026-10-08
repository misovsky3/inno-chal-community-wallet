import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  MyCommunityDashboardService,
  type PollResult,
} from './my-community-dashboard.service';

describe('MyCommunityDashboardService', () => {
  let service: MyCommunityDashboardService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyCommunityDashboardService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('loads the current user vote alongside the poll results', () => {
    let result: PollResult[] | undefined;
    service.getPolls(12, 34).subscribe((polls) => (result = polls));

    const request = httpTestingController.expectOne(
      '/api/accounts/12/polls?user_id=34',
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 9,
        account_id: 12,
        question: 'Oprava strechy',
        description: null,
        created_at: '2026-10-08T12:00:00Z',
        closes_at: '2026-12-31T22:59:59Z',
        status: 'open',
        total_votes: 1,
        options: [{ id: 2, label: 'Za', votes: 1 }],
        user_has_voted: true,
        amount: null,
        details: null,
        attachment_name: null,
        attachment_url: null,
      },
    ]);

    expect(result?.[0].user_has_voted).toBeTrue();
  });

  it('posts a new goal with its deadline and description', () => {
    let result: { id: number } | undefined;
    service
      .createGoal(12, 34, {
        name: 'Oprava strechy',
        description: 'Výmena krytiny',
        targetAmount: '2500',
        endDate: '2026-12-31',
      })
      .subscribe((goal) => (result = goal));

    const request = httpTestingController.expectOne('/api/accounts/12/goals');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      created_by_user_id: 34,
      name: 'Oprava strechy',
      description: 'Výmena krytiny',
      target_amount: '2500',
      end_date: '2026-12-31',
    });
    request.flush({ id: 5 });
    expect(result?.id).toBe(5);
  });

  it('loads one goal detail from its account endpoint', () => {
    let result: { id: number; description: string | null } | undefined;
    service.getGoal(12, 5).subscribe((goal) => (result = goal));

    const request = httpTestingController.expectOne(
      '/api/accounts/12/goals/5',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
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
    });

    expect(result?.id).toBe(5);
    expect(result?.description).toBe('Príprava pôdy a výsadba.');
  });

  it('creates a transaction for the community account', () => {
    const draft = {
      created_by_user_id: 34,
      goal_id: 5,
      date: '2026-10-08',
      amount: '25.00',
      currency: 'EUR',
      counterparty: 'Prispievateľ',
      direction: 'credit' as const,
      payment_type: 'Príspevok',
      details: 'Test organization',
      recipient_message: 'Spoločná záhrada',
      variable_symbol: '',
      specific_symbol: '',
      constant_symbol: '',
      payer_reference: '',
    };
    let result: { id: number } | undefined;
    service.createTransaction(12, draft).subscribe((transaction) => {
      result = transaction;
    });

    const request = httpTestingController.expectOne(
      '/api/accounts/12/transactions',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(draft);
    request.flush({ id: 17 });

    expect(result?.id).toBe(17);
  });

  it('loads new user notifications', () => {
    let result: { id: number }[] | undefined;
    service.getUserNotifications(34).subscribe((notifications) => {
      result = notifications;
    });

    const request = httpTestingController.expectOne(
      '/api/users/34/notifications?status=new',
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 11 }]);

    expect(result).toEqual([{ id: 11 }]);
  });

  it('marks a notification as read for its recipient', () => {
    let result: { id: number } | undefined;
    service.markNotificationRead(11, 34).subscribe((notification) => {
      result = notification;
    });

    const request = httpTestingController.expectOne('/api/notifications/11/read');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ user_id: 34 });
    request.flush({ id: 11 });

    expect(result?.id).toBe(11);
  });

  it('posts proposal fields and a PDF as multipart form data', () => {
    const attachment = new File(['%PDF-1.4'], 'proposal.pdf', {
      type: 'application/pdf',
    });
    let result: PollResult | undefined;
    service
      .createPollProposal(12, 34, {
        question: 'Oprava strechy',
        description: 'Výmena krytiny',
        closesAt: '2026-12-31T22:59:59.000Z',
        amount: '2500',
        details: 'Ponuka dodávateľa',
        attachment,
      })
      .subscribe((poll) => (result = poll));

    const request = httpTestingController.expectOne(
      '/api/accounts/12/polls/proposals',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    const body = request.request.body as FormData;
    expect(body.get('created_by_user_id')).toBe('34');
    expect(body.get('question')).toBe('Oprava strechy');
    expect(body.get('amount')).toBe('2500');
    expect(body.get('details')).toBe('Ponuka dodávateľa');
    expect((body.get('attachment') as File).name).toBe('proposal.pdf');

    const poll: PollResult = {
      id: 9,
      account_id: 12,
      question: 'Oprava strechy',
      description: 'Výmena krytiny',
      created_at: '2026-10-08T12:00:00Z',
      closes_at: '2026-12-31T22:59:59Z',
      status: 'open',
      total_votes: 0,
      options: [],
      amount: '2500.00',
      details: 'Ponuka dodávateľa',
      attachment_name: 'proposal.pdf',
      attachment_url: '/api/polls/9/attachment',
    };
    request.flush(poll);
    expect(result).toEqual(poll);
  });

  it('posts a vote for the selected poll option', () => {
    let result: PollResult | undefined;
    service.castPollVote(9, 34, 2).subscribe((poll) => (result = poll));

    const request = httpTestingController.expectOne('/api/polls/9/votes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ user_id: 34, option_id: 2 });
    request.flush({
      id: 9,
      account_id: 12,
      question: 'Oprava strechy',
      description: null,
      created_at: '2026-10-08T12:00:00Z',
      closes_at: '2026-12-31T22:59:59Z',
      status: 'open',
      total_votes: 1,
      options: [{ id: 2, label: 'Za', votes: 1 }],
      amount: null,
      details: null,
      attachment_name: null,
      attachment_url: null,
    });

    expect(result?.total_votes).toBe(1);
  });
});
