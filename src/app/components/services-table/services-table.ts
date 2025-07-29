import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService } from '../../services/modal.service';
import { ServiceService, ApiService, ServiceStats } from '../../services/service';
import { Subscription, firstValueFrom } from 'rxjs';

interface ServiceDisplay {
  id: number;
  name: string;
  category: string;
  duration: string;
  value: string;
  description?: string;
  isActive: boolean;
  raw: ApiService;
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

  stats: ServiceStats | null = null;
  services: ServiceDisplay[] = [];
  isLoading = true;
  error = '';

  ngOnInit() {
    this.loadData();
    window.addEventListener('refreshServices', this.loadData.bind(this));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    window.removeEventListener('refreshServices', this.loadData.bind(this));
  }

  async loadData() {
    this.isLoading = true;
    this.error = '';
    try {
      const [statsResponse, servicesResponse] = await Promise.all([
        firstValueFrom(this.serviceService.getStats()),
        firstValueFrom(this.serviceService.getServices())
      ]);

      this.stats = statsResponse.stats;
      this.services = servicesResponse.services.map(apiService => this.mapApiServiceToTableService(apiService));

    } catch (error) {
      console.error('❌ Error loading services data:', error);
      this.error = 'Não foi possível carregar os dados dos serviços.';
    } finally {
      this.isLoading = false;
    }
  }

  private mapApiServiceToTableService(apiService: ApiService): ServiceDisplay {
    return {
      id: apiService.id,
      name: apiService.name,
      category: apiService.category || 'N/A',
      duration: this.serviceService.formatDuration(apiService.duration_amount, apiService.duration_unit),
      value: this.serviceService.formatValue(apiService.value),
      isActive: apiService.is_active,
      raw: apiService
    };
  }
  
  openNewServicePage() {
    this.router.navigate(['/home/services/new']);
  }

  editService(id: number) {
    this.router.navigate(['/home/services/edit', id]);
  }

  async toggleServiceStatus(service: ServiceDisplay, event: MouseEvent) {
    event.stopPropagation();
    
    const action = service.isActive ? 'desativar' : 'ativar';
    if (confirm(`Tem certeza que deseja ${action} o serviço "${service.name}"?`)) {
      try {
        await firstValueFrom(this.serviceService.toggleServiceStatus(service.id));
        this.modalService.showSuccess(`Serviço ${action === 'desativar' ? 'desativado' : 'ativado'} com sucesso!`);
        this.loadData(); // Reload data to reflect changes
      } catch (error) {
        console.error(`❌ Error toggling service status:`, error);
        this.modalService.showError(`Não foi possível ${action} o serviço.`);
      }
    }
  }

  formatTotalValue(): string {
    if (!this.stats) return 'R$ 0,00';
    return this.serviceService.formatValue(this.stats.totalValue);
  }

  formatAverageDuration(): string {
    if (!this.stats) return '0 dias';
    // The average duration from stats is always in days
    return this.serviceService.formatDuration(this.stats.averageDuration, 'dias');
  }

  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'Consultoria': 'fas fa-comments',
      'Treinamento': 'fas fa-chalkboard-teacher',
      'Mentoria': 'fas fa-user-tie',
      'Diagnóstico': 'fas fa-stethoscope',
      'Desenvolvimento': 'fas fa-code',
      'Gestão': 'fas fa-tasks',
      'Estratégia': 'fas fa-bullseye'
    };
    return iconMap[category] || 'fas fa-concierge-bell';
  }
}