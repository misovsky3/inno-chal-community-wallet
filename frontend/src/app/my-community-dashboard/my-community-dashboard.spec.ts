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
                iban: null,
                balance: 0,
                currency: 'EUR',
                payme_url: null,
              }),
            getOrganizations: () => of([]),
            getTransactions: () => of([]),
            getGoals: () => of([]),
            getMembers: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyCommunityDashboard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('accountId', 1);
    fixture.componentRef.setInput('communityRole', 'admin');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
