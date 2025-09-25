import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntrevistaModal } from './entrevista-modal';

describe('EntrevistaModal', () => {
  let component: EntrevistaModal;
  let fixture: ComponentFixture<EntrevistaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntrevistaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntrevistaModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
