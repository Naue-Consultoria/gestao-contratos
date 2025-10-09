import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicRecruitmentProposalView } from './public-recruitment-proposal-view';

describe('PublicRecruitmentProposalView', () => {
  let component: PublicRecruitmentProposalView;
  let fixture: ComponentFixture<PublicRecruitmentProposalView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicRecruitmentProposalView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicRecruitmentProposalView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
