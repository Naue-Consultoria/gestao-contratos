import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicMentoriaHub } from './public-mentoria-hub';

describe('PublicMentoriaHub', () => {
  let component: PublicMentoriaHub;
  let fixture: ComponentFixture<PublicMentoriaHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicMentoriaHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicMentoriaHub);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
