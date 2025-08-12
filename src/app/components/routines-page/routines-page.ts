import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ContractService, ApiContract } from '../../services/contract';
import { ClientService } from '../../services/client';

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
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './routines-page.html',
  styleUrls: ['./routines-page.css']
})
export class RoutinesPageComponent implements OnInit {
  private contractService = inject(ContractService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  contracts: ContractRoutine[] = [];
  isLoading = true;
  error = '';


  ngOnInit() {
    this.loadContractRoutines();
  }

  loadContractRoutines() {
    this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading = true;
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

  editContract(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.router.navigate(['/home/contracts/edit', id]);
  }

}