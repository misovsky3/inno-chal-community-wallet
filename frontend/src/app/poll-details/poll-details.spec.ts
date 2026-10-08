import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PollDetails } from './poll-details';

describe('PollDetails', () => {
  let component: PollDetails;
  let fixture: ComponentFixture<PollDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PollDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
