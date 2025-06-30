import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CreateCompanyRequest, UpdateCompanyRequest, ApiCompany } from '../../services/company';

@Component({
  selector: 'app-company-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-modal.html',
  styleUrls: ['./company-modal.css']
})
export class CompanyModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() editingCompany: ApiCompany | null = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  
  private companyService = inject(CompanyService);
  
  // Form data
  companyData = {
    name: '',
    employees: null as number | null,
    foundationDate: '',
    headquarters: '',
    locations: '',
    market: ''
  };
  
  // Estado do formulário
  isSaving = false;
  errors: { [key: string]: string } = {};
  isEditMode = false;
  
  // Lista de setores predefinidos
  marketSectors = [
    'Tecnologia',
    'Saúde',
    'Educação',
    'Varejo',
    'Finanças',
    'Indústria',
    'Serviços',
    'Construção',
    'Agricultura',
    'Energia',
    'Transporte',
    'Telecomunicações',
    'Outro'
  ];
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingCompany'] && this.editingCompany) {
      this.loadCompanyData();
    } else if (changes['isOpen'] && this.isOpen && !this.editingCompany) {
      this.resetForm();
    }
  }
  
  /**
   * Carregar dados da empresa para edição
   */
  private loadCompanyData() {
    if (this.editingCompany) {
      this.isEditMode = true;
      this.companyData = {
        name: this.editingCompany.name || '',
        employees: this.editingCompany.employee_count,
        foundationDate: this.editingCompany.founded_date ? 
          new Date(this.editingCompany.founded_date).toISOString().split('T')[0] : '',
        headquarters: this.editingCompany.headquarters || '',
        locations: this.editingCompany.locations ? this.editingCompany.locations.join(', ') : '',
        market: this.editingCompany.market_sector || ''
      };
    }
  }
  
  /**
   * Lidar com clique no backdrop
   */
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }
  
  /**
   * Validar formulário
   */
  validateForm(): boolean {
    this.errors = {};
    
    // Nome é obrigatório
    if (!this.companyData.name.trim()) {
      this.errors['name'] = 'Nome da empresa é obrigatório';
    }
    
    // Número de funcionários deve ser positivo se preenchido
    if (this.companyData.employees !== null && this.companyData.employees < 0) {
      this.errors['employees'] = 'Número de funcionários deve ser positivo';
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  /**
   * Salvar empresa (criar ou atualizar)
   */
  async onSave() {
    if (!this.validateForm()) {
      return;
    }
    
    this.isSaving = true;
    
    try {
      if (this.isEditMode && this.editingCompany) {
        // Atualizar empresa existente
        await this.updateCompany();
      } else {
        // Criar nova empresa
        await this.createCompany();
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar empresa:', error);
      this.errors['general'] = error.error?.error || 'Erro ao salvar empresa. Tente novamente.';
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Criar nova empresa
   */
  private async createCompany() {
    const companyRequest: CreateCompanyRequest = {
      name: this.companyData.name.trim(),
      employee_count: this.companyData.employees || null,
      founded_date: this.companyData.foundationDate || null,
      headquarters: this.companyData.headquarters.trim() || null,
      locations: this.companyData.locations ? 
        this.companyData.locations.split(',').map(loc => loc.trim()).filter(loc => loc) : 
        [],
      market_sector: this.companyData.market.trim() || null
    };
    
    const response = await this.companyService.createCompany(companyRequest).toPromise();
    
    console.log('✅ Empresa criada:', response);
    
    // Emitir evento de sucesso com a empresa criada
    if (response && response.company) {
      this.save.emit({ company: response.company, isNew: true });
    } else {
      this.save.emit({ company: response, isNew: true });
    }
    
    // Limpar formulário
    this.resetForm();
  }
  
  /**
   * Atualizar empresa existente
   */
  private async updateCompany() {
    if (!this.editingCompany) return;
    
    const updateRequest: UpdateCompanyRequest = {
      name: this.companyData.name.trim(),
      employee_count: this.companyData.employees || null,
      founded_date: this.companyData.foundationDate || null,
      headquarters: this.companyData.headquarters.trim() || null,
      locations: this.companyData.locations ? 
        this.companyData.locations.split(',').map(loc => loc.trim()).filter(loc => loc) : 
        [],
      market_sector: this.companyData.market.trim() || null
    };
    
    const response = await this.companyService.updateCompany(
      this.editingCompany.id, 
      updateRequest
    ).toPromise();
    
    console.log('✅ Empresa atualizada:', response);
    
    // Emitir evento de sucesso com a empresa atualizada
    if (response && response.company) {
      this.save.emit({ company: response.company, isNew: false });
    } else {
      this.save.emit({ company: response, isNew: false });
    }
    
    // Limpar formulário
    this.resetForm();
  }
  
  /**
   * Limpar formulário
   */
  resetForm() {
    this.companyData = {
      name: '',
      employees: null,
      foundationDate: '',
      headquarters: '',
      locations: '',
      market: ''
    };
    this.errors = {};
    this.isEditMode = false;
  }
  
  /**
   * Fechar modal e limpar formulário
   */
  closeModal() {
    this.resetForm();
    this.close.emit();
  }
  
  /**
   * Obter título do modal
   */
  getModalTitle(): string {
    return this.isEditMode ? 'Editar Empresa' : 'Nova Empresa';
  }
  
  /**
   * Obter texto do botão
   */
  getButtonText(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Atualizando...' : 'Salvando...';
    }
    return this.isEditMode ? 'Atualizar Empresa' : 'Salvar Empresa';
  }
}