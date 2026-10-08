import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyCommunityInviteScreen } from './my-community-invite-screen';

describe('MyCommunityInviteScreen', () => {
  let component: MyCommunityInviteScreen;
  let fixture: ComponentFixture<MyCommunityInviteScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyCommunityInviteScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyCommunityInviteScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
