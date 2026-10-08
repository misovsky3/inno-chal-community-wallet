import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CreateGoal } from './create-goal';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

describe('CreateGoal', () => {
  let component: CreateGoal;
  let fixture: ComponentFixture<CreateGoal>;
  let dashboardService: jasmine.SpyObj<MyCommunityDashboardService>;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj<MyCommunityDashboardService>(
      'MyCommunityDashboardService',
      ['createGoal'],
    );
    dashboardService.createGoal.and.returnValue(
      of({
        id: 1,
        account_id: 2,
        name: 'Oprava strechy',
        goal_type: 'temporary',
        target_amount: 2500,
        currency: 'EUR',
        start_date: '2026-10-08',
        end_date: '2026-12-31',
        description: 'Výmena krytiny',
        raised_amount: 0,
        remaining_amount: 2500,
        progress_percentage: 0,
        status: 'in_progress',
      }),
    );
    await TestBed.configureTestingModule({
      imports: [CreateGoal],
      providers: [
        { provide: MyCommunityDashboardService, useValue: dashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGoal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('communityName', 'Komunitná záhrada Zelený Dvor');
    fixture.componentRef.setInput('accountId', 2);
    fixture.componentRef.setInput('createdByUserId', 7);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.detectChanges();
  });

  it('renders the goal form and required fields', () => {
    expect(fixture.nativeElement.textContent).toContain('Pridať cieľ');
    expect(fixture.nativeElement.textContent).toContain(
      'Komunitná záhrada Zelený Dvor',
    );
    expect(fixture.nativeElement.textContent).toContain('Cieľová suma');
    expect(
      (fixture.nativeElement.querySelector('input[name="name"]') as HTMLInputElement)
        .required,
    ).toBeTrue();
    expect(
      (fixture.nativeElement.querySelector('input[name="endDate"]') as HTMLInputElement)
        .required,
    ).toBeTrue();
  });

  it('creates the goal and closes after the API succeeds', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);
    component.name = 'Oprava strechy';
    component.description = 'Výmena krytiny';
    component.targetAmount = '2500';
    component.endDate = '2026-12-31';

    component.onSubmit(new Event('submit') as SubmitEvent);

    expect(dashboardService.createGoal).toHaveBeenCalledWith(2, 7, {
      name: 'Oprava strechy',
      description: 'Výmena krytiny',
      targetAmount: '2500',
      endDate: '2026-12-31',
    });
    expect(closed).toHaveBeenCalled();
  });

  it('keeps the form open and reports a failed submission', () => {
    dashboardService.createGoal.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);
    component.name = 'Oprava strechy';
    component.targetAmount = '2500';
    component.endDate = '2026-12-31';

    component.onSubmit(new Event('submit') as SubmitEvent);

    expect(closed).not.toHaveBeenCalled();
    expect(component.submitting).toBeFalse();
    expect(component.errorMessage).toContain('správca komunity');
  });
});
