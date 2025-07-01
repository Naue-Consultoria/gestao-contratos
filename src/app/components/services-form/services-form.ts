// src/app/components/service-form/service-form.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceService, CreateServiceRequest, UpdateServiceRequest } from '../../services/service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services-form.html',
  styleUrls: ['./services-form.css']
})
export class ServiceFormComponent implements OnInit {
  private serviceService = inject(ServiceService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Form data
  formData = {
    name: '',
    duration: 1, // Default 1 dia
    value: 0, // em reais (será convertido para centavos ao salvar)
    category: 'Geral',
    description: '',
    is_active: true
  };

  // Categories
  categories = [
    'Geral',
    'Consultoria',
    'Treinamento',
    'Mentoria',
    'Diagnóstico',
    'Desenvolvimento',
    'Gestão',
    'Estratégia'
  ];

  // UI state
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  serviceId: number | null = null;
  errors: any = {};

  ngOnInit() {
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.serviceId = parseInt(id);
      this.loadService();
    }
  }

  /**
   * Load service data for editing
   */
  async loadService() {
    if (!this.serviceId) return;

    this.isLoading = true;
    try {
      const response = await this.serviceService.getService(this.serviceId).toPromise();
      if (response && response.service) {
        const service = response.service;
        this.formData = {
          name: service.name,
          duration: service.duration,
          value: this.serviceService.convertToReais(service.value), // converter de centavos para reais
          category: service.category || 'Geral',
          description: service.description || '',
          is_active: service.is_active
        };
      }
    } catch (error) {
      console.error('❌ Error loading service:', error);
      this.modalService.showNotification('Erro ao carregar serviço', false);
      this.router.navigate(['/home/services']);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Format currency input
   */
  formatCurrency(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value) {
      const numericValue = parseInt(value) / 100;
      this.formData.value = numericValue;
      event.target.value = this.formatValueForDisplay(numericValue);
    } else {
      this.formData.value = 0;
      event.target.value = '';
    }
  }

  /**
   * Format value for display
   */
  formatValueForDisplay(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Validate form
   */
  validateForm(): boolean {
    this.errors = {};
    
    if (!this.formData.name || this.formData.name.trim().length < 2) {
      this.errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (this.formData.duration < 1 || this.formData.duration > 365) {
      this.errors.duration = 'Duração deve estar entre 1 e 365 dias';
    }
    
    if (this.formData.value <= 0) {
      this.errors.value = 'Valor deve ser maior que zero';
    }
    
    if (this.formData.description && this.formData.description.length > 1000) {
      this.errors.description = 'Descrição não pode exceder 1000 caracteres';
    }
    
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Save service
   */
  async save() {
    if (!this.validateForm()) {
      this.modalService.showNotification('Por favor, corrija os erros no formulário', false);
      return;
    }

    this.isSaving = true;
    
    try {
      if (this.isEditMode && this.serviceId) {
        // Update existing service
        const updateData: UpdateServiceRequest = {
          name: this.formData.name,
          duration: this.formData.duration,
          value: this.serviceService.convertToCents(this.formData.value), // converter para centavos
          category: this.formData.category,
          description: this.formData.description || null,
          is_active: this.formData.is_active
        };
        
        await this.serviceService.updateService(this.serviceId, updateData).toPromise();
        this.modalService.showNotification('Serviço atualizado com sucesso!', true);
      } else {
        // Create new service
        const createData: CreateServiceRequest = {
          name: this.formData.name,
          duration: this.formData.duration,
          value: this.serviceService.convertToCents(this.formData.value), // converter para centavos
          category: this.formData.category,
          description: this.formData.description || null,
          is_active: this.formData.is_active
        };
        
        await this.serviceService.createService(createData).toPromise();
        this.modalService.showNotification('Serviço criado com sucesso!', true);
      }
      
      // Dispatch event to refresh services list
      window.dispatchEvent(new CustomEvent('refreshServices'));
      
      // Navigate back to services list
      this.router.navigate(['/home/services']);
    } catch (error: any) {
      console.error('❌ Error saving service:', error);
      const errorMessage = error?.error?.error || 'Erro ao salvar serviço';
      this.modalService.showNotification(errorMessage, false);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Cancel and go back
   */
  cancel() {
    this.router.navigate(['/home/services']);
  }

  /**
   * Get formatted duration for display
   */
  getFormattedDuration(): string {
    return this.serviceService.formatDuration(this.formData.duration);
  }

  /**
   * Get formatted value for display
   */
  getFormattedValue(): string {
    // formData.value está em reais, mas formatValue espera centavos
    return this.serviceService.formatValue(this.serviceService.convertToCents(this.formData.value));
  }
}