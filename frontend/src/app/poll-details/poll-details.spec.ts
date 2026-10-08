import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PollDetails } from './poll-details';
import { MyCommunityDashboardService, type PollResult } from '../my-community-dashboard/my-community-dashboard.service';

describe('PollDetails', () => {
  let component: PollDetails;
  let fixture: ComponentFixture<PollDetails>;
  const poll: PollResult = {
    id: 2,
    account_id: 1,
    question: 'Obnova strechy',
    description: 'Schválenie obnovy strešného plášťa.',
    created_at: '2026-10-01T12:00:00Z',
    closes_at: '2026-10-22T21:59:00Z',
    status: 'open',
    total_votes: 4,
    options: [
      { id: 1, label: 'Za — súhlasím', votes: 3 },
      { id: 2, label: 'Proti — nesúhlasím', votes: 1 },
    ],
    amount: '2500.00',
    details: 'Návrh financovania opravy.',
    attachment_name: 'Technická správa.pdf',
    attachment_url: '/api/polls/2/attachment',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollDetails],
      providers: [
        {
          provide: MyCommunityDashboardService,
          useValue: { castPollVote: () => of(poll) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PollDetails);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('poll', poll);
    fixture.componentRef.setInput('communityName', 'Bytový dom Javorová 12');
    fixture.componentRef.setInput('userId', 7);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the loaded poll details and vote distribution', () => {
    expect(fixture.nativeElement.textContent).toContain('Bytový dom Javorová 12');
    expect(fixture.nativeElement.textContent).toContain('Obnova strechy');
    expect(fixture.nativeElement.textContent).toContain('Technická správa.pdf');
    expect(fixture.nativeElement.querySelector('.vote-progress > span').style.width).toBe('75%');
    expect(fixture.nativeElement.textContent).toContain('25 %');
  });

  it('submits the selected vote', () => {
    const updated = jasmine.createSpy('updated');
    component.updated.subscribe(updated);
    component.selectOption(2);
    component.submitVote(new Event('submit') as SubmitEvent);

    expect(updated).toHaveBeenCalledWith(poll);
    expect(component.successMessage).toBe('Váš hlas bol odoslaný.');
    expect(component.hasVoted).toBeTrue();
    expect(fixture.nativeElement.querySelector('.primary-action').disabled).toBeTrue();
  });

  it('allows selecting an option before voting', () => {
    const option = fixture.nativeElement.querySelector('input[name="poll-vote"]') as HTMLInputElement;
    option.click();
    fixture.detectChanges();

    expect(component.selectedOptionId).toBe(1);
    expect(fixture.nativeElement.querySelector('.primary-action').disabled).toBeFalse();
  });

  it('loads an existing vote and prevents submitting another one', () => {
    const votedPoll = { ...poll, user_has_voted: true };
    const votedFixture = TestBed.createComponent(PollDetails);
    const votedComponent = votedFixture.componentInstance;
    votedFixture.componentRef.setInput('poll', votedPoll);
    votedFixture.componentRef.setInput('communityName', 'Bytový dom Javorová 12');
    votedFixture.componentRef.setInput('userId', 7);
    votedFixture.detectChanges();

    expect(votedComponent.hasVoted).toBeTrue();
    expect(votedFixture.nativeElement.querySelector('.vote-already-cast').textContent).toContain(
      'Už ste v tomto hlasovaní hlasovali',
    );
    expect(votedFixture.nativeElement.querySelector('input[name="poll-vote"]').disabled).toBeTrue();
    expect(votedFixture.nativeElement.querySelector('.primary-action').disabled).toBeTrue();
  });
});
