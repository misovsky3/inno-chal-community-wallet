import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaceidSpinner } from './faceid-spinner';

describe('FaceidSpinner', () => {
  let component: FaceidSpinner;
  let fixture: ComponentFixture<FaceidSpinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaceidSpinner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaceidSpinner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
