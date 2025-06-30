import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Service {
  id: string;
  name: string;
}

@Component({
  selector: 'app-contract-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-modal.html',
  styleUrls: ['./contract-modal.css']
})
export class ContractModalComponent {
  @Input() isOpen = false;
  @Input() servicesList: Service[] = [];
  @Input() selectedServices: Set<string> = new Set();
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  
  toggleService(serviceId: string) {
    if (this.selectedServices.has(serviceId)) {
      this.selectedServices.delete(serviceId);
    } else {
      this.selectedServices.add(serviceId);
    }
  }
  
  isServiceSelected(serviceId: string): boolean {
    return this.selectedServices.has(serviceId);
  }
  
  getServiceName(serviceId: string): string {
    const service = this.servicesList.find(s => s.id === serviceId);
    return service ? service.name : '';
  }
  
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.close.emit();
    }
  }
}