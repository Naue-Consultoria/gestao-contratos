import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService, CreateCompanyRequest, UpdateCompanyRequest, ApiCompany } from '../../services/company';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-new-company-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-company-page.html',
  styleUrls: ['./new-company-page.css']
})
export class NewCompanyPageComponent implements OnInit {
  private companyService = inject(CompanyService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
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
  editingCompanyId: number | null = null;
  
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
  
  ngOnInit() {
    // Verificar se é modo de edição através dos parâmetros da rota
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editingCompanyId = +params['id'];
        this.loadCompanyData();
      }
    });
  }
  
  /**
   * Carregar dados da empresa para edição
   */
  private async loadCompanyData() {
    if (!this.editingCompanyId) return;
    
    try {
      const response = await this.companyService.getCompany(this.editingCompanyId).toPromise();
      
      if (response && response.company) {
        this.isEditMode = true;
        const company = response.company;
        
        this.companyData = {
          name: company.name || '',
          employees: company.employee_count,
          foundationDate: company.founded_date ? 
            new Date(company.founded_date).toISOString().split('T')[0] : '',
          headquarters: company.headquarters || '',
          locations: company.locations ? company.locations.join(', ') : '',
          market: company.market_sector || ''
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar empresa:', error);
      this.modalService.showNotification('Erro ao carregar dados da empresa', false);
      this.router.navigate(['/home/companies']);
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
      if (this.isEditMode && this.editingCompanyId) {
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
    
    // Mostrar notificação de sucesso
    this.modalService.showNotification('Empresa criada com sucesso!', true);
    
    // Disparar evento para atualizar lista
    window.dispatchEvent(new CustomEvent('refreshCompanies'));
    
    // Navegar de volta para a lista
    this.router.navigate(['/home/companies']);
  }
  
  /**
   * Atualizar empresa existente
   */
  private async updateCompany() {
    if (!this.editingCompanyId) return;
    
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
      this.editingCompanyId, 
      updateRequest
    ).toPromise();
    
    console.log('✅ Empresa atualizada:', response);
    
    // Mostrar notificação de sucesso
    this.modalService.showNotification('Empresa atualizada com sucesso!', true);
    
    // Disparar evento para atualizar lista
    window.dispatchEvent(new CustomEvent('refreshCompanies'));
    
    // Navegar de volta para a lista
    this.router.navigate(['/home/companies']);
  }
  
  /**
   * Cancelar e voltar para a lista
   */
  onCancel() {
    this.router.navigate(['/home/companies']);
  }
  
  /**
   * Obter título da página
   */
  getPageTitle(): string {
    return this.isEditMode ? 'Editar Empresa' : 'Nova Empresa';
  }
  
  /**
   * Obter texto do botão
   */
  getButtonText(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Atualizando...' : 'Salvando...';
    }
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }
}