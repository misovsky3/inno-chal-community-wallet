import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionUnavailable } from './function-unavailable';

describe('FunctionUnavailable', () => {
  let component: FunctionUnavailable;
  let fixture: ComponentFixture<FunctionUnavailable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunctionUnavailable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunctionUnavailable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the unavailable message', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Táto funkcionalita je momentálne nedostupná',
    );
  });

  it('emits close when displayed over the community dashboard', () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    spyOn(component.closed, 'emit');

    component.goBack();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
