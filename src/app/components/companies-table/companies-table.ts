import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';

interface Company {
  id: number;
  name: string;
  initials: string;
  employees: number;
  location: string;
  market: string;
  contracts: number;
  activeContracts: number;
  totalValue: string;
  since: string;
  gradient: string;
}

@Component({
  selector: 'app-companies-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companies-table.html',
  styleUrls: ['./companies-table.css']
})
export class CompaniesTableComponent {
  private modalService = inject(ModalService);

  // Stats
  stats = {
    total: 45,
    active: 38,
    activePercentage: 84,
    newProspects: 12
  };

  // Companies data
  companies: Company[] = [
    {
      id: 1,
      name: 'Empresa ABC',
      initials: 'EA',
      employees: 150,
      location: 'São Paulo, SP',
      market: 'Tecnologia',
      contracts: 2,
      activeContracts: 2,
      totalValue: 'R$ 125.000',
      since: '2021',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 2,
      name: 'Tech Solutions',
      initials: 'TS',
      employees: 80,
      location: 'Rio de Janeiro, RJ',
      market: 'Software',
      contracts: 1,
      activeContracts: 1,
      totalValue: 'R$ 48.000',
      since: '2022',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ];

  openCompanyModal() {
    this.modalService.openCompanyModal$.next();
  }

  editCompany(id: number) {
    console.log('Editing company:', id);
    this.modalService.openCompanyModal$.next();
  }
}