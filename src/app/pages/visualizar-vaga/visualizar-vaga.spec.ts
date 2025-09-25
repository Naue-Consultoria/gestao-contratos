import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualizarVaga } from './visualizar-vaga';

describe('VisualizarVaga', () => {
  let component: VisualizarVaga;
  let fixture: ComponentFixture<VisualizarVaga>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualizarVaga]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisualizarVaga);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
