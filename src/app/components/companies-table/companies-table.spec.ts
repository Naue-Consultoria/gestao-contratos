import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesTable } from './companies-table';

describe('CompaniesTable', () => {
  let component: CompaniesTable;
  let fixture: ComponentFixture<CompaniesTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
