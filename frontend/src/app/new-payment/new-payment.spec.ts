import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewPayment } from './new-payment';
import { MyCommunityDashboardService } from '../my-community-dashboard/my-community-dashboard.service';

describe('NewPayment', () => {
  let component: NewPayment;
  let fixture: ComponentFixture<NewPayment>;
  let createTransaction: jasmine.Spy;
  const account = {
    id: 1,
    name: 'Test account',
    iban: 'SK00 1100 0000 0000 0000 0001',
    balance: 100,
    currency: 'EUR',
    payme_url: null,
  };

  beforeEach(async () => {
    createTransaction = jasmine.createSpy('createTransaction').and.returnValue(
      of({
        id: 11,
        account_id: 1,
        goal_id: 5,
        date: '2026-10-08',
        amount: 25,
        currency: 'EUR',
        counterparty: 'Prispievateľ',
        direction: 'credit',
        payment_type: 'Príspevok',
        details: 'Test organization',
        recipient_message: 'Spoločná záhrada',
        variable_symbol: null,
        payer_reference: null,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [NewPayment],
      providers: [
        {
          provide: MyCommunityDashboardService,
          useValue: { createTransaction },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewPayment);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', account);
    fixture.componentRef.setInput('communityName', 'Test organization');
    fixture.componentRef.setInput('direction', 'credit');
    fixture.componentRef.setInput('goalId', 5);
    fixture.componentRef.setInput('goalName', 'Spoločná záhrada');
    fixture.componentRef.setInput('createdByUserId', 7);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prefills the organization as the recipient for a goal contribution', () => {
    expect(component.recipientName).toBe('Test organization');
    expect(component.recipientIban).toBe(account.iban);
    expect(component.recipientMessage).toBe('Spoločná záhrada');
  });

  it('creates a credit transaction for the selected goal', () => {
    component.amount = '25';
    component.submit();

    expect(createTransaction).toHaveBeenCalledWith(1, jasmine.objectContaining({
      created_by_user_id: 7,
      goal_id: 5,
      amount: '25.00',
      direction: 'credit',
      counterparty: 'Prispievateľ',
      recipient_message: 'Spoločná záhrada',
    }));
  });
});
