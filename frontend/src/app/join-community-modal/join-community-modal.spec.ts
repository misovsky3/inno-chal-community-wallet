import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinCommunityModal } from './join-community-modal';

describe('JoinCommunityModal', () => {
  let component: JoinCommunityModal;
  let fixture: ComponentFixture<JoinCommunityModal>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinCommunityModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinCommunityModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('token', 'invite-token');
    fixture.componentRef.setInput('userId', 42);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    httpTestingController
      .expectOne('/api/invitations/invite-token')
      .flush({
        token: 'invite-token',
        account_id: 23,
        role: 'read_only',
        expires_at: '2030-01-01T00:00:00Z',
        uses_remaining: 1,
        invite_path: '/join/invite-token',
      });
    httpTestingController.expectOne('/api/accounts/23').flush({
      id: 23,
      name: 'Community',
      iban: null,
      balance: 0,
      currency: 'EUR',
      payme_url: null,
    });
    expect(component).toBeTruthy();
  });

  it('accepts the invitation for the logged-in user', () => {
    httpTestingController
      .expectOne('/api/invitations/invite-token')
      .flush({
        token: 'invite-token',
        account_id: 23,
        role: 'read_only',
        expires_at: '2030-01-01T00:00:00Z',
        uses_remaining: 1,
        invite_path: '/join/invite-token',
      });
    httpTestingController.expectOne('/api/accounts/23').flush({
      id: 23,
      name: 'Community',
      iban: null,
      balance: 0,
      currency: 'EUR',
      payme_url: null,
    });
    fixture.detectChanges();

    const result = {
      account_id: 23,
      user_id: 42,
      role: 'read_only' as const,
      message: 'User joined the demo account',
    };
    spyOn(component.joined, 'emit');
    component.accept();
    httpTestingController
      .expectOne({
        method: 'POST',
        url: '/api/invitations/invite-token/accept',
      })
      .flush(result);

    expect(component.joined.emit).toHaveBeenCalledWith(result);
  });
});
