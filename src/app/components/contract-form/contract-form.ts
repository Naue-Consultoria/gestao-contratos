import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ContractService, CreateContractRequest, UpdateContractRequest, ApiContract, ContractServiceItem } from '../../services/contract';
import { CompanyService, ApiCompany } from '../../services/company';
import { ServiceService, ApiService } from '../../services/service';
import { ModalService } from '../../services/modal.service';

interface SelectedService {
  service_id: number;
  name: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  duration: number;
  category: string;
}

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-form.html',
  styleUrls: ['./contract-form.css']
})

export class ContractFormComponent implements OnInit {
  private contractService = inject(ContractService);
  private companyService = inject(CompanyService);
  private serviceService = inject(ServiceService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Form data
  formData = {
    contract_number: '',
    company_id: null as number | null,
    type: 'Full' as 'Full' | 'Pontual' | 'Individual',
    start_date: '',
    end_date: '',
    notes: ''
  };

  // Services
  availableServices: ApiService[] = [];
  selectedServices: SelectedService[] = [];
  
  // Companies
  companies: ApiCompany[] = [];
  
  // Contract types
  contractTypes = ['Full', 'Pontual', 'Individual'];
  
  // UI state
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  isViewMode = false;
  contractId: number | null = null;
  errors: any = {};
  
  // Service selection
  showServiceModal = false;
  serviceSearchTerm = '';


  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const isView = this.route.snapshot.url.some(segment => segment.path === 'view');
    
    if (id) {
      this.contractId = parseInt(id);
      this.isEditMode = !isView;
      this.isViewMode = isView;
      this.loadContract();
    } else {
      // Generate contract number for new contracts
      this.generateContractNumber();
    }
    
    this.loadCompanies();
    this.loadServices();
  }

  /**
   * Generate contract number
   */
  async generateContractNumber() {
    try {
      const response = await this.contractService.generateContractNumber().toPromise();
      if (response) {
        this.formData.contract_number = response.contractNumber;
      }
    } catch (error) {
      console.error('❌ Error generating contract number:', error);
    }
  }

  /**
   * Load contract data for editing/viewing
   */
  async loadContract() {
    if (!this.contractId) return;

    this.isLoading = true;
    try {
      const response = await this.contractService.getContract(this.contractId).toPromise();
      if (response && response.contract) {
        const contract = response.contract;
        
        // Fill form data
        this.formData = {
          contract_number: contract.contract_number,
          company_id: contract.company.id,
          type: contract.type,
          start_date: contract.start_date.split('T')[0], // Format for date input
          end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
          notes: contract.notes || ''
        };
        
        // Map services
        this.selectedServices = contract.contract_services.map(cs => ({
          service_id: cs.service.id,
          name: cs.service.name,
          quantity: cs.quantity,
          unit_value: cs.unit_value,
          total_value: cs.total_value,
          duration: cs.service.duration,
          category: cs.service.category
        }));
      }
    } catch (error) {
      console.error('❌ Error loading contract:', error);
      this.modalService.showNotification('Erro ao carregar contrato', false);
      this.router.navigate(['/home/contracts']);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load companies
   */
  async loadCompanies() {
    try {
      const response = await this.companyService.getCompanies({ is_active: true }).toPromise();
      if (response && response.companies) {
        this.companies = response.companies;
      }
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    }
  }

  /**
   * Load services
   */
  async loadServices() {
    try {
      const response = await this.serviceService.getServices({ is_active: true }).toPromise();
      if (response && response.services) {
        this.availableServices = response.services;
      }
    } catch (error) {
      console.error('❌ Error loading services:', error);
    }
  }

  /**
   * Get filtered services for modal
   */
  get filteredServices(): ApiService[] {
    if (!this.serviceSearchTerm) {
      return this.availableServices;
    }
    
    const search = this.serviceSearchTerm.toLowerCase();
    return this.availableServices.filter(service => 
      service.name.toLowerCase().includes(search) ||
      (service.category && service.category.toLowerCase().includes(search))
    );
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Open service selection modal
   */
  openServiceModal() {
    this.showServiceModal = true;
    this.serviceSearchTerm = '';
  }

  /**
   * Close service selection modal
   */
  closeServiceModal() {
    this.showServiceModal = false;
    this.serviceSearchTerm = '';
  }

  /**
   * Add service to contract
   */
  addService(service: ApiService) {
    // Check if already added
    if (this.selectedServices.find(s => s.service_id === service.id)) {
      this.modalService.showNotification('Serviço já adicionado ao contrato', false);
      return;
    }
    
    // Add service
    this.selectedServices.push({
      service_id: service.id,
      name: service.name,
      quantity: 1,
      unit_value: service.value, // já em centavos
      total_value: service.value,
      duration: service.duration,
      category: service.category || 'Geral'
    });
    
    this.closeServiceModal();
  }

  /**
   * Remove service from contract
   */
  removeService(index: number) {
    this.selectedServices.splice(index, 1);
  }

  /**
   * Update service quantity
   */
  updateServiceQuantity(index: number, quantity: number) {
    if (quantity < 1) return;
    
    const service = this.selectedServices[index];
    service.quantity = quantity;
    service.total_value = service.unit_value * quantity;
  }

  /**
   * Calculate total contract value
   */
  getTotalValue(): number {
    return this.selectedServices.reduce((sum, service) => sum + service.total_value, 0);
  }

  /**
   * Get formatted total value
   */
  getFormattedTotalValue(): string {
    return this.contractService.formatValue(this.getTotalValue());
  }

  /**
   * Calculate total duration
   */
  getTotalDuration(): number {
    if (this.selectedServices.length === 0) return 0;
    return Math.max(...this.selectedServices.map(s => s.duration));
  }

  /**
   * Validate form
   */
  validateForm(): boolean {
    this.errors = {};
    
    if (!this.formData.contract_number) {
      this.errors.contract_number = 'Número do contrato é obrigatório';
    }
    
    if (!this.formData.company_id) {
      this.errors.company_id = 'Empresa é obrigatória';
    }
    
    if (!this.formData.start_date) {
      this.errors.start_date = 'Data de início é obrigatória';
    }
    
    if (this.formData.end_date && this.formData.end_date < this.formData.start_date) {
      this.errors.end_date = 'Data de término deve ser posterior à data de início';
    }
    
    if (this.selectedServices.length === 0) {
      this.errors.services = 'Pelo menos um serviço deve ser adicionado ao contrato';
    }
    
    return Object.keys(this.errors).length === 0;
  }

   /**
   * Save contract
   */
   async save() {
    if (!this.validateForm()) {
      this.modalService.showWarning(
        'Por favor, corrija os erros no formulário antes de continuar',
        'Formulário Inválido'
      );
      return;
    }

    this.isSaving = true;
    
    try {
      // Prepare services data
      const services: ContractServiceItem[] = this.selectedServices.map(s => ({
        service_id: s.service_id,
        quantity: s.quantity,
        unit_value: s.unit_value
      }));

      if (this.isEditMode && this.contractId) {
        // Update existing contract
        const updateData: UpdateContractRequest = {
          contract_number: this.formData.contract_number,
          company_id: this.formData.company_id!,
          type: this.formData.type,
          start_date: this.formData.start_date,
          end_date: this.formData.end_date || null,
          services: services,
          notes: this.formData.notes || null
        };
        
        await this.contractService.updateContract(this.contractId, updateData).toPromise();
        
        this.modalService.showSuccess(
          `Contrato ${this.formData.contract_number} atualizado com sucesso!`,
          'Contrato Atualizado',
          {
            persistent: true,
            action: {
              label: 'Visualizar',
              callback: () => this.router.navigate(['/home/contracts/view', this.contractId])
            }
          }
        );
      } else {
        // Create new contract
        const createData: CreateContractRequest = {
          contract_number: this.formData.contract_number,
          company_id: this.formData.company_id!,
          type: this.formData.type,
          start_date: this.formData.start_date,
          end_date: this.formData.end_date || null,
          services: services,
          notes: this.formData.notes || null
        };
        
        const response = await this.contractService.createContract(createData).toPromise();
        
        if (response && response.contract) {
          this.modalService.showSuccess(
            `Contrato ${this.formData.contract_number} criado com sucesso!`,
            'Novo Contrato',
            {
              persistent: true,
              duration: 7000,
              action: {
                label: 'Visualizar',
                callback: () => this.router.navigate(['/home/contracts/view', response.contract.id])
              }
            }
          );
        }
      }
      
      // Navigate back to list
      this.router.navigate(['/home/contracts']);
      
    } catch (error: any) {
      console.error('Erro ao salvar contrato:', error);
      
      this.modalService.showError(
        error.error?.message || 'Erro ao salvar contrato. Verifique os dados e tente novamente.',
        'Erro',
        { duration: 8000 }
      );
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Cancel and go back
   */
  cancel() {
    this.router.navigate(['/home/contracts']);
  }

  /**
   * Enable edit mode (from view mode)
   */
  enableEdit() {
    this.isViewMode = false;
    this.isEditMode = true;
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    return this.contractService.formatValue(value);
  }

  /**
   * Get company name by ID
   */
  getCompanyName(companyId: number | null): string {
    if (!companyId) return '-';
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : '-';
  }

    /**
     * Check if service is already selected
     */
    isServiceSelected(serviceId: number): boolean {
      return this.selectedServices.some(s => s.service_id === serviceId);
    }
  }