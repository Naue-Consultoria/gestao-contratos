// src/app/components/service-form/service-form.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceService, ApiService, CreateServiceRequest, UpdateServiceRequest } from '../../services/service';
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
    duration: 60, // Default 60 minutos
    value: 0,
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

  // Duration presets
  durationPresets = [
    { label: '30 min', value: 30 },
    { label: '1 hora', value: 60 },
    { label: '2 horas', value: 120 },
    { label: '4 horas', value: 240 },
    { label: '8 horas', value: 480 },
    { label: 'Personalizado', value: 0 }
  ];

  // UI state
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  serviceId: number | null = null;
  showDurationCustom = false;
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
          value: service.value,
          category: service.category || 'Geral',
          description: service.description || '',
          is_active: service.is_active
        };
        
        // Check if duration is custom
        this.checkCustomDuration();
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
   * Check if duration is custom value
   */
  checkCustomDuration() {
    const isPreset = this.durationPresets.some(preset => 
      preset.value === this.formData.duration && preset.value !== 0
    );
    this.showDurationCustom = !isPreset;
  }

  /**
   * Handle duration preset change
   */
  onDurationPresetChange(value: number) {
    if (value === 0) {
      this.showDurationCustom = true;
      this.formData.duration = 60; // Default custom value
    } else {
      this.showDurationCustom = false;
      this.formData.duration = value;
    }
  }

  /**
   * Format currency input
   */
  formatCurrency(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value) {
      value = (parseInt(value) / 100).toFixed(2);
      this.formData.value = parseFloat(value);
      event.target.value = this.formatValueForDisplay(this.formData.value);
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
    
    if (this.formData.duration < 1 || this.formData.duration > 1440) {
      this.errors.duration = 'Duração deve estar entre 1 minuto e 24 horas';
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
          value: this.formData.value,
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
          value: this.formData.value,
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
    return this.serviceService.formatValue(this.formData.value);
  }
}