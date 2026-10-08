import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginScreen } from './login-screen';

describe('LoginScreen', () => {
  let component: LoginScreen;
  let fixture: ComponentFixture<LoginScreen>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginScreen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginScreen);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    httpTestingController.expectOne('/api/users').flush([]);
    expect(component).toBeTruthy();
  });

  it('loads and displays users from the API and logs in as the selected user', fakeAsync(() => {
    httpTestingController.expectOne('/api/users').flush([
      { id: 10, name: 'Jana N.', email: 'jana@example.com' },
      { id: 11, name: 'Peter K.', email: 'peter@example.com' },
    ]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].textContent).toContain('Jana N.');

    select.value = '11';
    select.dispatchEvent(new Event('change'));
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    component.login();
    tick(1800);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
      queryParams: { userId: 11 },
    });
  }));

  it('opens the invitation on the dashboard after logging in', fakeAsync(() => {
    httpTestingController.expectOne('/api/users').flush([
      { id: 10, name: 'Jana N.', email: 'jana@example.com' },
    ]);
    component.invitationToken = 'invite-token';
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    component.login();
    tick(1800);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
      queryParams: { userId: 10, invitationToken: 'invite-token' },
    });
  }));
});
