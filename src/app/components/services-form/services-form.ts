import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceService, CreateServiceRequest, UpdateServiceRequest } from '../../services/service';
import { ServiceStageService, CreateServiceStageRequest } from '../../services/service-stage.service';
import { ModalService } from '../../services/modal.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';

interface ServiceStageForm {
  name: string;
  description?: string;
  sort_order: number;
  error?: string;
}

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, NgxEditorModule],
  templateUrl: './services-form.html',
  styleUrls: ['./services-form.css']
})
export class ServiceFormComponent implements OnInit, OnDestroy {
  private serviceService = inject(ServiceService);
  private serviceStageService = inject(ServiceStageService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  editor!: Editor;
  toolbar: Toolbar = [
    ['bold', 'italic', 'underline'],
    ['ordered_list', 'bullet_list'],
  ];

  formData = {
    name: '',
    duration_amount: 30 as number | null,
    duration_unit: 'dias' as 'dias' | 'semanas' | 'meses' | 'encontros' | 'Projeto',
    category: 'Geral',
    description: '',
    is_active: true
  };

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

  isLoading = false;
  isSaving = false;
  isEditMode = false;
  serviceId: number | null = null;
  errors: any = {};

  // Service stages properties
  serviceStages: ServiceStageForm[] = [];

  ngOnInit() {
    this.editor = new Editor();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.serviceId = parseInt(id);
      this.loadService();
    }
  }

  ngOnDestroy() {
    this.editor.destroy();
  }


  async loadService() {
    if (!this.serviceId) return;

    this.isLoading = true;
    try {
      const response = await this.serviceService.getService(this.serviceId).toPromise();
      if (response && response.service) {
        const service = response.service;
        this.formData = {
          name: service.name,
          duration_amount: service.duration_amount || (service.duration_unit === 'Projeto' ? null : 30),
          duration_unit: service.duration_unit as any,
          category: service.category || 'Geral',
          description: service.description || '',
          is_active: service.is_active
        };
      }
    } catch (error) {
      console.error('❌ Error loading service:', error);
      this.modalService.showNotification('Erro ao carregar serviço', false);
      this.router.navigate(['/home/servicos']);
    } finally {
      this.isLoading = false;
    }
  }


  validateForm(): boolean {
    this.errors = {};
    if (!this.formData.name || this.formData.name.trim().length < 2) {
      this.errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    if (this.formData.duration_unit !== 'Projeto' && (!this.formData.duration_amount || this.formData.duration_amount < 1)) {
      this.errors.duration = 'A duração deve ser de no mínimo 1';
    }
    const descriptionText = this.formData.description.replace(/<[^>]*>/g, '');
    if (descriptionText.length > 10000) {
      this.errors.description = 'A descrição não pode exceder 10000 caracteres.';
    }
    
    // Validar etapas
    const stagesValid = this.validateStages();
    
    return Object.keys(this.errors).length === 0 && stagesValid;
  }

  async save() {
    if (!this.validateForm()) {
      this.modalService.showNotification('Por favor, corrija os erros no formulário', false);
      return;
    }

    this.isSaving = true;
    
    try {
      if (this.isEditMode && this.serviceId) {
        const updateData: UpdateServiceRequest = {
          name: this.formData.name,
          duration_amount: this.formData.duration_unit === 'Projeto' ? null : this.formData.duration_amount,
          duration_unit: this.formData.duration_unit,
          category: this.formData.category,
          description: this.formData.description || null,
          is_active: this.formData.is_active
        };
        
        await this.serviceService.updateService(this.serviceId, updateData).toPromise();
        
        // Atualizar etapas se é modo de edição
        if (this.serviceStages.length > 0) {
          await this.createServiceStages(this.serviceId);
        }
        
        this.modalService.showNotification('Serviço atualizado com sucesso!', true);
      } else {
        const createData: CreateServiceRequest = {
          name: this.formData.name,
          duration_amount: this.formData.duration_unit === 'Projeto' ? null : this.formData.duration_amount,
          duration_unit: this.formData.duration_unit,
          category: this.formData.category,
          description: this.formData.description || null
        };
        
        const response = await this.serviceService.createService(createData).toPromise();
        
        // Se há etapas definidas, criar as etapas após criar o serviço
        if (response?.service?.id && this.serviceStages.length > 0) {
          await this.createServiceStages(response.service.id);
        }
        
        this.modalService.showNotification('Serviço criado com sucesso!', true);
      }
      
      window.dispatchEvent(new CustomEvent('refreshServices'));
      
      this.router.navigate(['/home/servicos']);
    } catch (error: any) {
      console.error('❌ Error saving service:', error);
      const errorMessage = error?.error?.error || 'Erro ao salvar serviço';
      this.modalService.showNotification(errorMessage, false);
    } finally {
      this.isSaving = false;
    }
  }

  cancel() {
    this.router.navigate(['/home/servicos']);
  }

  onDurationUnitChange() {
    if (this.formData.duration_unit === 'Projeto') {
      this.formData.duration_amount = null;
    } else if (!this.formData.duration_amount) {
      this.formData.duration_amount = 30;
    }
  }

  getFormattedDuration(): string {
    return this.serviceService.formatDuration(this.formData.duration_amount, this.formData.duration_unit);
  }

  get descriptionTextLength(): number {
      return this.formData.description.replace(/<[^>]*>/g, '').length;
  }

  // Service stages methods
  addStage() {
    this.serviceStages.push({
      name: '',
      description: '',
      sort_order: this.serviceStages.length + 1
    });
  }

  removeStage(index: number) {
    this.serviceStages.splice(index, 1);
    // Reordenar sort_order
    this.serviceStages.forEach((stage, i) => {
      stage.sort_order = i + 1;
    });
  }


  validateStages(): boolean {
    let hasError = false;
    
    this.serviceStages.forEach(stage => {
      stage.error = undefined;
      if (!stage.name || stage.name.trim().length < 2) {
        stage.error = 'Nome da etapa deve ter pelo menos 2 caracteres';
        hasError = true;
      }
    });
    
    return !hasError;
  }

  async createServiceStages(serviceId: number) {
    if (this.serviceStages.length === 0) return;
    
    try {
      for (const stage of this.serviceStages) {
        const stageData: CreateServiceStageRequest = {
          service_id: serviceId,
          name: stage.name.trim(),
          description: stage.description?.trim() || null,
          sort_order: stage.sort_order
        };
        
        await this.serviceStageService.createStage(stageData).toPromise();
      }
    } catch (error) {
      console.error('Erro ao criar etapas do serviço:', error);
      this.modalService.showNotification('Erro ao criar algumas etapas do serviço', false);
    }
  }
}