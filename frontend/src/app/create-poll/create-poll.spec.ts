import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CreatePoll } from './create-poll';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

describe('CreatePoll', () => {
  let component: CreatePoll;
  let fixture: ComponentFixture<CreatePoll>;
  let dashboardService: jasmine.SpyObj<MyCommunityDashboardService>;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj<MyCommunityDashboardService>(
      'MyCommunityDashboardService',
      ['createPollProposal'],
    );
    dashboardService.createPollProposal.and.returnValue(
      of({
        id: 1,
        account_id: 2,
        question: 'Oprava strechy',
        description: null,
        created_at: '2026-10-08T12:00:00Z',
        closes_at: '2026-12-31T22:59:59Z',
        status: 'open',
        total_votes: 0,
        options: [],
        amount: '2500.00',
        details: null,
        attachment_name: null,
        attachment_url: null,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [CreatePoll],
      providers: [
        { provide: MyCommunityDashboardService, useValue: dashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePoll);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('communityName', 'Bytový dom Javorová 12');
    fixture.componentRef.setInput('accountId', 2);
    fixture.componentRef.setInput('createdByUserId', 7);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the poll proposal form and its community name', () => {
    expect(fixture.nativeElement.textContent).toContain('Vytvoriť hlasovanie');
    expect(fixture.nativeElement.textContent).toContain('Bytový dom Javorová 12');
    expect(fixture.nativeElement.textContent).toContain('Náklady a financovanie');
    expect(fixture.nativeElement.querySelector('input[name="question"]').required).toBeTrue();
  });

  it('submits the proposal and closes after the API succeeds', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);
    component.question = 'Oprava strechy';
    component.description = 'Výmena krytiny';
    component.closesAt = '2026-12-31';
    component.amount = '2500';
    component.details = 'Ponuka dodávateľa';

    component.onSubmit(new Event('submit') as SubmitEvent);

    expect(dashboardService.createPollProposal).toHaveBeenCalledWith(
      2,
      7,
      jasmine.objectContaining({
        question: 'Oprava strechy',
        description: 'Výmena krytiny',
        closesAt: new Date('2026-12-31T23:59:59').toISOString(),
        amount: '2500',
        details: 'Ponuka dodávateľa',
        attachment: null,
      }),
    );
    expect(closed).toHaveBeenCalled();
  });

  it('keeps the form open and shows an error when the API rejects the request', () => {
    dashboardService.createPollProposal.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);
    component.question = 'Oprava strechy';
    component.closesAt = '2026-12-31';
    component.amount = '2500';

    component.onSubmit(new Event('submit') as SubmitEvent);

    expect(closed).not.toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
    expect(component.errorMessage).toContain('správca komunity');
  });
});
