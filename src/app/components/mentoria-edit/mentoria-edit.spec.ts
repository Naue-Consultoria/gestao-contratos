import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentoriaEdit } from './mentoria-edit';

describe('MentoriaEdit', () => {
  let component: MentoriaEdit;
  let fixture: ComponentFixture<MentoriaEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentoriaEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentoriaEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
