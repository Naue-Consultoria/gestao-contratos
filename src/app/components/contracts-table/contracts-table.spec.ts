import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractsTable } from './contracts-table';

describe('ContractsTable', () => {
  let component: ContractsTable;
  let fixture: ComponentFixture<ContractsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractsTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
