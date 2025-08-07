import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ClientService, ApiClient } from '../../services/client';
import { ContractService, ApiContract } from '../../services/contract';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';

interface ClientDisplay {
  id: number;
  name: string;
  initials: string;
  type: 'PF' | 'PJ';
  location: string;
  document: string;
  contracts: number;
  activeContracts: number;
  totalValue: string;
  since: string;
  gradient: string;
  actionMenuOpen: boolean;
  raw: ApiClient;
}

@Component({
  selector: 'app-clients-table',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './clients-table.html',
  styleUrls: ['./clients-table.css']
})
export class ClientsTableComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private modalService = inject(ModalService);
  private clientService = inject(ClientService);
  private contractService = inject(ContractService);
  private router = inject(Router);

  private subscriptions = new Subscription();

  stats = {
    total: 0,
    active: 0,
    activePercentage: 0,
    newProspects: 0
  };

  clients: ClientDisplay[] = [];
  filteredClients: ClientDisplay[] = [];
  searchTerm = '';
  isLoading = true;
  error = '';

  ngOnInit() {
    this.loadData();
    window.addEventListener('refreshClients', this.loadData.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshClients', this.loadData.bind(this));
  }

  async loadData() {
    this.isLoading = true;
    this.error = '';
    try {
      const clientsResponse = await firstValueFrom(this.clientService.getClients({ is_active: true }));
      const contractsResponse = await firstValueFrom(this.contractService.getContracts());
      this.stats.total = clientsResponse.total || clientsResponse.clients.length;
      this.stats.active = clientsResponse.clients.length;
      this.stats.activePercentage = this.stats.total > 0 ? Math.round((this.stats.active / this.stats.total) * 100) : 0;
      
      this.clients = clientsResponse.clients.map(apiClient => {
        const clientContracts = contractsResponse.contracts.filter(c => c.client.id === apiClient.id);
        const aggregates = {
          totalCount: clientContracts.length,
          activeCount: clientContracts.filter(c => c.status === 'active').length,
          totalValue: clientContracts.reduce((sum, c) => sum + c.total_value, 0)
        };
        return this.mapApiClientToTableClient(apiClient, aggregates);
      });
      
      this.filteredClients = [...this.clients];

    } catch (err) {
      console.error('❌ Error loading client data:', err);
      this.error = 'Não foi possível carregar os dados dos clientes.';
    } finally {
      this.isLoading = false;
    }
  }

  async softDeleteClient(client: ClientDisplay, event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Tem certeza que deseja DESATIVAR o cliente "${client.name}"? O cliente sairá da lista principal, mas o histórico será mantido.`)) {
      try {
        await firstValueFrom(this.clientService.deleteClient(client.id));
        this.modalService.showSuccess('Cliente desativado com sucesso!');
        this.loadData();
      } catch (error) {
        this.modalService.showError('Não foi possível desativar o cliente.');
      }
    }
  }

  async hardDeleteClient(client: ClientDisplay, event: MouseEvent) {
    event.stopPropagation();
    const confirmation = prompt(`Esta ação é irreversível e excluirá PERMANENTEMENTE o cliente "${client.name}" e todos os dados associados. Para confirmar, digite o nome do cliente:`);
    if (confirmation === client.name) {
      try {
        await firstValueFrom(this.clientService.deleteClientPermanent(client.id));
        this.modalService.showSuccess('Cliente excluído permanentemente!');
        this.loadData();
      } catch (error) {
        this.modalService.showError('Não foi possível excluir o cliente permanentemente.');
      }
    } else if (confirmation !== null) {
      this.modalService.showWarning('O nome digitado não confere. A exclusão foi cancelada.');
    }
  }

  private mapApiClientToTableClient(apiClient: ApiClient, aggregates?: { totalCount: number, activeCount: number, totalValue: number }): ClientDisplay {
    const initials = this.getInitials(apiClient.name);
    const since = new Date(apiClient.created_at).getFullYear().toString();
    
    return {
      id: apiClient.id,
      name: apiClient.name,
      initials: initials,
      type: apiClient.type,
      location: `${apiClient.city}/${apiClient.state}`,
      document: this.clientService.getFormattedDocument(apiClient),
      contracts: aggregates?.totalCount || 0,
      activeContracts: aggregates?.activeCount || 0,
      totalValue: this.contractService.formatValue(aggregates?.totalValue || 0),
      since: since,
      gradient: this.generateGradient(apiClient.name),
      actionMenuOpen: false,
      raw: apiClient
    };
  }

  private getInitials(name: string): string {
    const words = name.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'NN';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  private generateGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    
    return gradients[Math.abs(hash) % gradients.length];
  }


  openNewClientPage() {
    this.router.navigate(['/home/clients/new']);
  }

  editClient(id: number) {
    this.router.navigate(['/home/clients/edit', id]);
  }

  toggleActionMenu(client: ClientDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.clients.forEach(c => c.actionMenuOpen = (c.id === client.id) ? !c.actionMenuOpen : false);
  }

  onClientSaved() {
    this.loadData();
    this.modalService.showNotification('Cliente salvo com sucesso!', true);
  }

  filterClients() {
    if (!this.searchTerm.trim()) {
      this.filteredClients = [...this.clients];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client => {
      return client.name.toLowerCase().includes(term) ||
             client.document.toLowerCase().includes(term) ||
             client.location.toLowerCase().includes(term) ||
             client.type.toLowerCase().includes(term);
    });
  }

  clearSearch() {
    this.searchTerm = '';
    this.filterClients();
  }
}