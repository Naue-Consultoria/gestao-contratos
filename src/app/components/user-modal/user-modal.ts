import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-modal.html',
  styleUrls: ['./user-modal.css']
})
export class UserModalComponent {
  @Input() isOpen = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  
  // Form data
  userData = {
    fullName: '',
    email: '',
    role: '',
    permission: 'Leitura'
  };
  
  permissionLevels = ['Leitura', 'Leitura/Escrita', 'Total'];
  
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