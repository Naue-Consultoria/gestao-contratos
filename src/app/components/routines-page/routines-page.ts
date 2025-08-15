import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ContractService, ApiContract } from '../../services/contract';
import { ClientService } from '../../services/client';
import { AuthService } from '../../services/auth';

interface ContractRoutine {
  id: number;
  contractNumber: string;
  clientName: string;
  type: string;
  status: string;
  statusColor: string;
  servicesCount: number;
  nextDueDate: string;
  raw: ApiContract;
}

@Component({
  selector: 'app-routines-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './routines-page.html',
  styleUrls: ['./routines-page.css']
})
export class RoutinesPageComponent implements OnInit {
  private contractService = inject(ContractService);
  private clientService = inject(ClientService);
  private authService = inject(AuthService);
  private router = inject(Router);

  contracts: ContractRoutine[] = [];
  filteredContracts: ContractRoutine[] = [];
  searchTerm = '';
  isLoading = true;
  error = '';
  currentUser = this.authService.getUser();
  private searchTimeout: any;

  // Client filter properties
  selectedClient = '';
  isClientFilterOpen = false;
  clientSearchTerm = '';
  availableClients: { name: string; count: number }[] = [];
  filteredClients: { name: string; count: number }[] = [];


  ngOnInit() {
    this.loadContractRoutines();
    // Close dropdown when clicking outside
    document.addEventListener('click', this.closeClientFilter.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closeClientFilter.bind(this));
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  loadContractRoutines() {
    this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading = true;
      // O backend já filtra automaticamente:
      // - Admin: vê todos os contratos
      // - Usuário comum: vê apenas contratos aos quais está atribuído
      const response = await this.contractService.getContracts().toPromise();
      
      if (response && response.contracts) {
        // Carregar clientes para mapear nomes
        const clientsResponse = await this.clientService.getClients().toPromise();
        const clientsMap = new Map();
        
        if (clientsResponse && clientsResponse.clients) {
          clientsResponse.clients.forEach((client: any) => {
            const name = client.company_name || client.full_name || 'Cliente sem nome';
            clientsMap.set(client.id, name);
          });
        }

        this.contracts = response.contracts
          .filter((contract: ApiContract) => contract.status === 'active')
          .map((contract: ApiContract) => ({
            id: contract.id,
            contractNumber: contract.contract_number,
            clientName: clientsMap.get(contract.client?.id) || 'Cliente não encontrado',
            type: this.getTypeLabel(contract.type),
            status: contract.status,
            statusColor: this.getStatusColor(contract.status),
            servicesCount: contract.contract_services?.length || 0,
            nextDueDate: this.calculateNextDueDate(contract),
            raw: contract
          }))
          .sort((a, b) => {
            // Ordenar por data de criação (mais recentes primeiro)
            return new Date(b.raw.created_at).getTime() - new Date(a.raw.created_at).getTime();
          });
        
        this.filteredContracts = [...this.contracts];
        this.prepareClientsList();
      }
    } catch (error) {
      console.error('Erro ao carregar rotinas de contratos:', error);
      this.error = 'Erro ao carregar rotinas de contratos';
    } finally {
      this.isLoading = false;
    }
  }

  private getTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'Full': 'Contrato Full',
      'Pontual': 'Contrato Pontual', 
      'Individual': 'Mentoria Individual'
    };
    return types[type] || type;
  }

  private getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'active': '#10b981',
      'completed': '#6b7280',
      'cancelled': '#ef4444',
      'suspended': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  }


  private calculateNextDueDate(contract: ApiContract): string {
    // Lógica simplificada - pode ser expandida baseada nos serviços do contrato
    const startDate = new Date(contract.start_date);
    const nextMonth = new Date(startDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return nextMonth.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }


  viewContractDetails(id: number) {
    this.router.navigate(['/home/routines', id]);
  }


  onSearchChange(event: any) {
    const searchValue = event.target.value;
    this.searchTerm = searchValue;
    
    // Debounce search to avoid excessive filtering
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.filterContracts();
    }, 300);
  }

  clearSearch() {
    this.searchTerm = '';
    this.selectedClient = '';
    this.applyFilters();
  }

  prepareClientsList() {
    const clientCounts = new Map<string, number>();
    
    this.contracts.forEach(contract => {
      const clientName = contract.clientName;
      clientCounts.set(clientName, (clientCounts.get(clientName) || 0) + 1);
    });
    
    this.availableClients = Array.from(clientCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    this.filteredClients = [...this.availableClients];
  }

  toggleClientFilter() {
    this.isClientFilterOpen = !this.isClientFilterOpen;
    if (this.isClientFilterOpen) {
      // Reset search when opening
      this.clientSearchTerm = '';
      this.filteredClients = [...this.availableClients];
    }
  }

  closeClientFilter() {
    this.isClientFilterOpen = false;
  }

  filterClients() {
    if (!this.clientSearchTerm.trim()) {
      this.filteredClients = [...this.availableClients];
      return;
    }

    const searchLower = this.clientSearchTerm.toLowerCase().trim();
    this.filteredClients = this.availableClients.filter(client =>
      client.name.toLowerCase().includes(searchLower)
    );
  }

  selectClient(clientName: string) {
    this.selectedClient = clientName;
    this.isClientFilterOpen = false;
    this.applyFilters();
  }

  private filterContracts() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.contracts];

    // Apply client filter
    if (this.selectedClient) {
      filtered = filtered.filter(contract => 
        contract.clientName === this.selectedClient
      );
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(contract => {
        const contractNumberMatch = contract.contractNumber.toLowerCase().includes(searchLower);
        const clientNameMatch = contract.clientName.toLowerCase().includes(searchLower);
        const typeMatch = contract.type.toLowerCase().includes(searchLower);
        
        return contractNumberMatch || clientNameMatch || typeMatch;
      });
    }

    this.filteredContracts = filtered;
  }

}