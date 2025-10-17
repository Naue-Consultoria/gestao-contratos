import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentoriaTemplatesModalComponent } from './mentoria-templates-modal';

describe('MentoriaTemplatesModalComponent', () => {
  let component: MentoriaTemplatesModalComponent;
  let fixture: ComponentFixture<MentoriaTemplatesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentoriaTemplatesModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentoriaTemplatesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
