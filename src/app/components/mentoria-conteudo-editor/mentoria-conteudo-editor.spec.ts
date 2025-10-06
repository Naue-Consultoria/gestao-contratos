import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentoriaConteudoEditor } from './mentoria-conteudo-editor';

describe('MentoriaConteudoEditor', () => {
  let component: MentoriaConteudoEditor;
  let fixture: ComponentFixture<MentoriaConteudoEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentoriaConteudoEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentoriaConteudoEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
