import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyModal } from './company-modal';

describe('CompanyModal', () => {
  let component: CompanyModal;
  let fixture: ComponentFixture<CompanyModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
