// src/app/components/contracts-table/contracts-table.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';

interface Contract {
  id: number;
  company: string;
  companyInitials: string;
  companyType: string;
  contractType: string;
  services: number;
  activeServices: number;
  progress: number;
  status: 'active' | 'pending' | 'completed';
  gradient: string;
}

@Component({
  selector: 'app-contracts-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contracts-table.html',
  styleUrls: ['./contracts-table.css']
})
export class ContractsTableComponent {
  private modalService = inject(ModalService);
  
  currentContractTab = 'all';
  
  contracts: Contract[] = [
    {
      id: 1,
      company: 'Empresa ABC',
      companyInitials: 'EA',
      companyType: 'Tecnologia',
      contractType: 'Contrato Grande',
      services: 5,
      activeServices: 3,
      progress: 60,
      status: 'active',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 2,
      company: 'Tech Solutions',
      companyInitials: 'TS',
      companyType: 'Software',
      contractType: 'Contrato Pontual',
      services: 2,
      activeServices: 1,
      progress: 80,
      status: 'active',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 3,
      company: 'Startup XYZ',
      companyInitials: 'SX',
      companyType: 'Fintech',
      contractType: 'Mentoria Individual',
      services: 1,
      activeServices: 0,
      progress: 25,
      status: 'pending',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ];
  
  openContractModal() {
    this.modalService.openContractModal$.next();
  }
  
  viewContract(id: number) {
    console.log('Viewing contract:', id);
    this.modalService.openContractModal$.next();
  }
  
  showContractTab(tab: string) {
    this.currentContractTab = tab;
    // Aqui você pode filtrar os contratos baseado na tab
  }
  
  exportToPDF() {
    console.log('Exporting to PDF...');
    // Implementar exportação
  }
  
  exportToExcel() {
    console.log('Exporting to Excel...');
    // Implementar exportação
  }
}