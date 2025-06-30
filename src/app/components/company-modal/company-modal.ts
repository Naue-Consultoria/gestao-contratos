import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-company-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-modal.html',
  styleUrls: ['./company-modal.css']
})
export class CompanyModalComponent {
  @Input() isOpen = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  
  // Form data
  companyData = {
    name: '',
    employees: 0,
    foundationDate: '',
    headquarters: '',
    locations: '',
    market: ''
  };
  
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.close.emit();
    }
  }
  
  onSave() {
    // Here you would normally validate and process the data
    this.save.emit();
  }
}