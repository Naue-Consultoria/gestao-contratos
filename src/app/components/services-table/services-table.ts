import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ServiceService, ApiService } from '../../services/service';
import { Subscription } from 'rxjs';

interface Service {
  id: number;
  name: string;
  duration: string;
  value: string;
  category: string;
  description: string;
  is_active: boolean;
}

@Component({
  selector: 'app-services-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-table.html',
  styleUrls: ['./services-table.css']
})
export class ServicesTableComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private serviceService = inject(ServiceService);
  private router = inject(Router);
  private subscriptions = new Subscription();

  // Stats
  stats = {
    total: 0,
    active: 0,
    totalValue: 0,
    averageDuration: 0
  };

  // Services data
  services: Service[] = [];
  
  // Loading state
  isLoading = false;
  error = '';

  ngOnInit() {
    this.loadServices();
    this.subscribeToRefreshEvents();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Inscrever-se em eventos de atualização
   */
  private subscribeToRefreshEvents() {
    // Escutar evento de atualização de serviços
    window.addEventListener('refreshServices', () => {
      this.loadServices();
    });
  }

  /**
   * Carregar serviços do servidor
   */
  async loadServices() {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.serviceService.getServices().toPromise();
      
      if (response && response.services) {
        // Mapear serviços da API para o formato da tabela
        this.services = response.services.map(apiService => this.mapApiServiceToTableService(apiService));
        
        // Atualizar estatísticas
        this.updateStats(response.services);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar serviços:', error);
      this.error = 'Erro ao carregar serviços. Tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Mapear serviço da API para formato da tabela
   */
  private mapApiServiceToTableService(apiService: ApiService): Service {
    return {
      id: apiService.id,
      name: apiService.name,
      duration: this.serviceService.formatDuration(apiService.duration),
      value: this.serviceService.formatValue(apiService.value),
      category: apiService.category || 'Geral',
      description: apiService.description || '',
      is_active: apiService.is_active
    };
  }

  /**
   * Atualizar estatísticas
   */
  private updateStats(services: ApiService[]) {
    this.stats.total = services.length;
    this.stats.active = services.filter(s => s.is_active).length;
    
    if (services.length > 0) {
      this.stats.totalValue = services.reduce((sum, s) => sum + s.value, 0);
      this.stats.averageDuration = Math.round(
        services.reduce((sum, s) => sum + s.duration, 0) / services.length
      );
    } else {
      this.stats.totalValue = 0;
      this.stats.averageDuration = 0;
    }
  }

  /**
   * Navegar para página de novo serviço
   */
  openNewServicePage() {
    this.router.navigate(['/home/services/new']);
  }

  /**
   * Navegar para página de edição de serviço
   */
  editService(id: number) {
    this.router.navigate(['/home/services/edit', id]);
  }

  /**
   * Alternar status do serviço
   */
  async toggleServiceStatus(id: number, event: Event) {
    event.stopPropagation();
    
    try {
      await this.serviceService.toggleServiceStatus(id).toPromise();
      this.loadServices();
      this.modalService.showNotification('Status do serviço atualizado!', true);
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      this.modalService.showNotification('Erro ao alterar status do serviço', false);
    }
  }

  /**
   * Formatar valor total das estatísticas
   */
  formatTotalValue(): string {
    return this.serviceService.formatValue(this.stats.totalValue);
  }

  /**
   * Formatar duração média
   */
  formatAverageDuration(): string {
    return this.serviceService.formatDuration(this.stats.averageDuration);
  }
}