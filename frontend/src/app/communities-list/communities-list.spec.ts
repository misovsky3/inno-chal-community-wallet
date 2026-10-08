import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CommunitiesList } from './communities-list';
import { CommunitiesListService } from './communities-list.service';

describe('CommunitiesList', () => {
  let component: CommunitiesList;
  let fixture: ComponentFixture<CommunitiesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitiesList],
      providers: [
        {
          provide: CommunitiesListService,
          useValue: { getUserAccounts: () => of([]) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunitiesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
