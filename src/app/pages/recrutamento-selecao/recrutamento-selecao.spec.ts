import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecrutamentoSelecao } from './recrutamento-selecao';

describe('RecrutamentoSelecao', () => {
  let component: RecrutamentoSelecao;
  let fixture: ComponentFixture<RecrutamentoSelecao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecrutamentoSelecao]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecrutamentoSelecao);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
