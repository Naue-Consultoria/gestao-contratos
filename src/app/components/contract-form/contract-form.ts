import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContractService, CreateContractRequest, UpdateContractRequest, ContractServiceItem, ContractInstallment, ApiContractInstallment, UserAssignment } from '../../services/contract';
import { ClientService, ApiClient } from '../../services/client';
import { ServiceService, ApiService } from '../../services/service';
import { ModalService } from '../../services/modal.service';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { UserSelectionModalComponent } from '../user-selection-modal/user-selection-modal';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { InstallmentsManagerComponent } from '../installments-manager/installments-manager';

interface SelectedService {
  service_id: number;
  name: string;
  unit_value: number;
  total_value: number;
  duration: number | null;
  duration_unit: string; // Added this property
  category: string;
}

interface AssignableUser {
  id: number;
  name: string;
  email: string;
}

interface AssignedUser {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: 'owner' | 'editor' | 'viewer';
}

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSelectionModalComponent, CurrencyMaskDirective, BreadcrumbComponent, InstallmentsManagerComponent],
  templateUrl: './contract-form.html',
  styleUrls: ['./contract-form.css'],
})
export class ContractFormComponent implements OnInit {
  private contractService = inject(ContractService);
  private clientService = inject(ClientService);
  private serviceService = inject(ServiceService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private breadcrumbService = inject(BreadcrumbService);

  formData: any = {
    contract_number: '',
    client_id: null as number | null,
    type: 'Full' as 'Full' | 'Pontual' | 'Individual',
    status: 'active' as 'active' | 'completed' | 'cancelled' | 'suspended',
    start_date: '',
    end_date: '',
    notes: '',
    payment_method: '',
    expected_payment_date: '',
    payment_status: 'pendente' as 'pago' | 'pendente',
    installment_count: 1,
  };

  contractStatuses = [
    { value: 'active', label: 'Ativo' },
    { value: 'completed', label: 'Concluído' },
    { value: 'suspended', label: 'Suspenso' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  availableServices: ApiService[] = [];
  selectedServices: SelectedService[] = [];
  clients: ApiClient[] = [];
  contractTypes = ['Full', 'Pontual', 'Individual'];
  assignedUsers: AssignedUser[] = [];
  paymentMethods = this.contractService.getPaymentMethods();
  
  // Propriedades para parcelamento
  contractInstallments: ContractInstallment[] = [];
  apiInstallments: ApiContractInstallment[] = [];
  firstInstallmentDate: string = '';
  
  availableRoles = [
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Visualizador' }
  ];

  allUsers: AssignableUser[] = [];
  currentUserId: number | null = null;

  isLoading = true;
  isSaving = false;
  isEditMode = false;
  isViewMode = false;
  isUserModalOpen = false;
  contractId: number | null = null;
  errors: any = {};

  showServiceModal = false;
  serviceSearchTerm = '';
  serviceCategoryFilter = '';

  ngOnInit() {
    this.currentUserId = this.authService.getUser()?.id ?? null;
    const id = this.route.snapshot.paramMap.get('id');
    const isView = this.route.snapshot.url.some(
      (segment) => segment.path === 'view'
    );

    if (id) {
      this.contractId = parseInt(id);
      this.isEditMode = !isView;
      this.isViewMode = isView;
      this.setBreadcrumb(id, isView);
      this.loadContract();
    } else {
      this.setBreadcrumb();
      this.generateContractNumber();
      this.setDefaultFirstInstallmentDate();
      this.isLoading = false;
    }

    this.loadInitialData();
  }

  private setBreadcrumb(id?: string, isView?: boolean) {
    const baseBreadcrumbs: any[] = [
      { label: 'Home', url: '/home/dashboard', icon: 'fas fa-home' },
      { label: 'Contratos', url: '/home/contracts' }
    ];

    if (id) {
      if (isView) {
        baseBreadcrumbs.push({ label: `Visualizar Contrato #${id}` });
      } else {
        baseBreadcrumbs.push({ label: `Editar Contrato #${id}` });
      }
    } else {
      baseBreadcrumbs.push({ label: 'Novo Contrato' });
    }

    this.breadcrumbService.setBreadcrumbs(baseBreadcrumbs);
  }

  private setDefaultFirstInstallmentDate() {
    if (!this.firstInstallmentDate) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      this.firstInstallmentDate = nextMonth.toISOString().split('T')[0];
    }
  }

  loadInitialData() {
    this.loadClients();
    this.loadServices();
    this.loadUsersForAssignment();
  }

  async loadUsersForAssignment() {
    try {
      const response = await firstValueFrom(this.userService.getUsers());
      if (response && response.users) {
        this.allUsers = response.users
          .filter((user) => user.id !== this.currentUserId)
          .map((user) => ({ id: user.id, name: user.name, email: user.email }));
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
    }
  }

  async generateContractNumber() {
    try {
      const response = await firstValueFrom(
        this.contractService.generateContractNumber()
      );
      if (response) {
        this.formData.contract_number = response.contractNumber;
      }
    } catch (error) {
      console.error('❌ Error generating contract number:', error);
    }
  }

  async loadContract() {
    if (!this.contractId) {
        this.isLoading = false;
        return;
    }
    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.contractService.getContract(this.contractId)
      );
      if (response && response.contract) {
        const contract = response.contract as any;
        this.formData = {
          contract_number: contract.contract_number,
          client_id: contract.client.id,
          type: contract.type,
          status: contract.status,
          start_date: contract.start_date.split('T')[0],
          end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
          notes: contract.notes || '',
          payment_method: contract.payment_method || '',
          expected_payment_date: contract.expected_payment_date ? contract.expected_payment_date.split('T')[0] : '',
          payment_status: contract.payment_status || 'pendente',
          installment_count: contract.installment_count || 1,
        };
        this.selectedServices = contract.contract_services.map((cs: any) => ({
          service_id: cs.service.id,
          name: cs.service.name,
          unit_value: cs.unit_value,
          total_value: cs.total_value,
          duration: cs.service.duration,
          duration_unit: cs.service.duration_unit,
          category: cs.service.category,
        }));
        this.assignedUsers = contract.assigned_users || [];
        
        // Carregar parcelas se existirem
        if (contract.installments && contract.installments.length > 0) {
          this.apiInstallments = contract.installments;
          
          // Definir a data da primeira parcela se existir
          if (contract.installments[0] && contract.installments[0].due_date) {
            this.firstInstallmentDate = contract.installments[0].due_date.split('T')[0];
          }
        }
      }
    } catch (error) {
      this.modalService.showError('Erro ao carregar contrato');
      this.router.navigate(['/home/contratos']);
    } finally {
      this.isLoading = false;
    }
  }

  async loadClients() {
    try {
      const response = await firstValueFrom(
        this.clientService.getClients({ is_active: true })
      );
      if (response && response.clients) this.clients = response.clients;
    } catch (error) {
      console.error('❌ Error loading clients:', error);
    }
  }

  async loadServices() {
    try {
      const response = await firstValueFrom(
        this.serviceService.getServices({ is_active: true })
      );
      if (response && response.services)
        this.availableServices = response.services;
    } catch (error) {
      console.error('❌ Error loading services:', error);
    }
  }

  onRoleChangeLocal(assignedUser: AssignedUser, newRole: string): void {
    if (this.isEditMode && this.contractId) {
      this.onRoleChange(assignedUser, newRole);
    } else {
      assignedUser.role = newRole as 'owner' | 'editor' | 'viewer';
    }
  }

  async onRoleChange(assignedUser: AssignedUser, newRole: string) {
    if (!this.contractId) return;

    try {
      await firstValueFrom(this.contractService.updateUserRole(this.contractId, assignedUser.user.id, newRole));
      this.modalService.showSuccess(`Permissão de ${assignedUser.user.name} alterada para ${this.getRoleLabel(newRole)}.`);
      assignedUser.role = newRole as 'owner' | 'editor' | 'viewer';
    } catch (error) {
      console.error('Error updating user role:', error);
      this.modalService.showError('Não foi possível alterar a permissão do usuário.');
      this.loadContract(); 
    }
  }

  getRoleLabel(roleValue: string): string {
    const allRoles = [
      { value: 'owner', label: 'Proprietário' },
      { value: 'editor', label: 'Editor' },
      { value: 'viewer', label: 'Visualizador' }
    ];
    return allRoles.find(r => r.value === roleValue)?.label || roleValue;
  }

  async applyUserPermissions(contractId: number): Promise<void> {
    for (const assignedUser of this.assignedUsers) {
      try {
        await firstValueFrom(
          this.contractService.updateUserRole(contractId, assignedUser.user.id, assignedUser.role)
        );
      } catch (error) {
        console.error(`Erro ao aplicar permissão para usuário ${assignedUser.user.name}:`, error);
        // Não exibir erro para o usuário pois o contrato já foi criado
      }
    }
  }

  get filteredServices(): ApiService[] {
    let services = this.availableServices;

    if (this.serviceCategoryFilter) {
      services = services.filter(s => s.category === this.serviceCategoryFilter);
    }

    if (this.serviceSearchTerm) {
      const search = this.serviceSearchTerm.toLowerCase();
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.category?.toLowerCase().includes(search)
      );
    }

    return services;
  }

  formatDate(dateString: string): string {
    return this.contractService.formatDate(dateString);
  }

  formatServiceDuration(service: ApiService): string {
    return this.serviceService.formatDuration(service.duration_amount, service.duration_unit);
  }

  get availableCategories(): string[] {
    const categories = this.availableServices
      .map(s => s.category || 'Geral')
      .filter((category, index, self) => self.indexOf(category) === index)
      .sort();
    return categories;
  }

  openServiceModal() {
    this.showServiceModal = true;
    this.serviceSearchTerm = '';
    this.serviceCategoryFilter = '';
  }

  closeServiceModal() {
    this.showServiceModal = false;
    this.serviceSearchTerm = '';
    this.serviceCategoryFilter = '';
  }

  addService(service: ApiService) {
    this.selectedServices.push({
      service_id: service.id,
      name: service.name,
      unit_value: 0,
      total_value: 0,
      duration: service.duration_amount || null,
      duration_unit: service.duration_unit,
      category: service.category || 'Geral',
    });
    this.closeServiceModal();
  }

  removeService(index: number) {
    this.selectedServices.splice(index, 1);
  }

  onPriceChange(index: number, priceInReais: number) {
    const service = this.selectedServices[index];
    if (priceInReais < 0) {
      priceInReais = 0;
    }
    service.unit_value = priceInReais;
    service.total_value = service.unit_value; 
    
    this.formData.total_value = this.getTotalValue();
    
    // Recriar parcelas se necessário
    if (this.formData.installment_count > 1 && this.firstInstallmentDate) {
      this.generateInstallments();
    }
  }

  getTotalValue(): number {
    return this.selectedServices.reduce((sum, s) => sum + s.total_value, 0);
  }

  getFormattedTotalValue(): string {
    return this.contractService.formatValue(this.getTotalValue());
  }

  openUserModal(): void {
    this.isUserModalOpen = true;
  }
  
  closeUserModal(): void {
    this.isUserModalOpen = false;
  }

  getAssignedUserIds(): number[] {
    return this.assignedUsers.map(u => u.user.id);
  }

  updateAssignedUsers(selectedIds: number[]): void {
    const currentIds = new Set(this.assignedUsers.map(u => u.user.id));
    selectedIds.forEach(id => {
        if (!currentIds.has(id)) {
            const userToAdd = this.allUsers.find(u => u.id === id);
            if (userToAdd) {
                this.assignedUsers.push({
                    id: 0, 
                    user: {
                        id: userToAdd.id,
                        name: userToAdd.name,
                        email: userToAdd.email
                    },
                    role: 'editor' 
                });
            }
        }
    });
    this.closeUserModal();
  }

  removeUser(userToRemove: AssignedUser): void {
      const userIndex = this.assignedUsers.findIndex(u => u.user.id === userToRemove.user.id);
      if (userIndex > -1) {
          this.assignedUsers.splice(userIndex, 1);
      }
  }

  validateForm(): boolean {
    this.errors = {};
    if (!this.formData.contract_number)
      this.errors.contract_number = 'Número do contrato é obrigatório';
    if (!this.formData.client_id)
      this.errors.client_id = 'Cliente é obrigatório';
    if (!this.formData.start_date)
      this.errors.start_date = 'Data de início é obrigatória';
    if (this.selectedServices.length === 0)
      this.errors.services = 'Pelo menos um serviço deve ser adicionado';
    return Object.keys(this.errors).length === 0;
  }

  async save() {
    if (!this.validateForm()) {
      this.modalService.showWarning('Por favor, corrija os erros no formulário', 'Formulário Inválido');
      return;
    }
    this.isSaving = true;

    const userIdsToSave = this.assignedUsers.map(u => u.user.id);

    try {
      const services: ContractServiceItem[] = this.selectedServices.map(
        (s) => ({
          service_id: s.service_id,
          unit_value: s.unit_value,
        })
      );

      if (this.isEditMode && this.contractId) {
        const updateData: UpdateContractRequest = {
          contract_number: this.formData.contract_number,
          client_id: this.formData.client_id!,
          type: this.formData.type,
          start_date: this.formData.start_date,
          end_date: this.formData.end_date || null,
          services: services,
          notes: this.formData.notes || null,
          status: this.formData.status,
          assigned_users: userIdsToSave,
          payment_method: this.formData.payment_method || null,
          expected_payment_date: this.formData.expected_payment_date || null,
          payment_status: this.formData.payment_status,
          installment_count: this.formData.installment_count || 1,
          installments: this.contractInstallments,
        };
        await firstValueFrom(
          this.contractService.updateContract(this.contractId, updateData)
        );
        this.modalService.showSuccess('Contrato atualizado com sucesso!', 'Sucesso');
      } else {
        const createData: CreateContractRequest = {
          contract_number: this.formData.contract_number,
          client_id: this.formData.client_id!,
          type: this.formData.type,
          start_date: this.formData.start_date,
          end_date: this.formData.end_date || null,
          notes: this.formData.notes || null,
          services,
          assigned_users: userIdsToSave,
          payment_method: this.formData.payment_method || null,
          expected_payment_date: this.formData.expected_payment_date || null,
          payment_status: this.formData.payment_status,
          installment_count: this.formData.installment_count || 1,
          installments: this.contractInstallments,
        };
        const createdContract = await firstValueFrom(this.contractService.createContract(createData));
        
        // Aplicar permissões personalizadas após criação
        if (createdContract.contract?.id) {
          await this.applyUserPermissions(createdContract.contract.id);
        }
        
        this.modalService.showSuccess('Contrato criado com sucesso!', 'Sucesso');
      }
      this.router.navigate(['/home/contratos']);
    } catch (error: any) {
      this.modalService.showError(error.error?.message || 'Erro ao salvar o contrato.', 'Erro');
    } finally {
      this.isSaving = false;
    }
  }

  cancel() {
    this.router.navigate(['/home/contratos']);
  }

  enableEdit() {
    this.isViewMode = false;
    this.isEditMode = true;
  }

  formatCurrency(value: number): string {
    return this.contractService.formatValue(value);
  }

  getClientName(clientId: number | null): string {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? client.name : '-';
  }

  getStatusText(status: string): string {
    if (!status) return '';
    return this.contractService.getStatusText(status);
  }

  getPaymentStatusText(status: string): string {
    if (!status) return 'Não informado';
    return this.contractService.getPaymentStatusText(status);
  }

  // Métodos para gerenciar parcelas
  onInstallmentsChange(installments: ContractInstallment[]) {
    this.contractInstallments = installments;
  }

  onInstallmentCountChange(count: number) {
    this.formData.installment_count = count;
    
    if (count > 1 && this.getTotalValue() > 0 && this.firstInstallmentDate) {
      this.generateInstallments();
    } else if (count === 1) {
      this.contractInstallments = [];
      // Quando voltar para "À vista", resetar para a data padrão se não foi definida manualmente
      if (!this.formData.expected_payment_date) {
        this.formData.expected_payment_date = '';
      }
    }
  }

  onFirstInstallmentDateChange(date: string) {
    this.firstInstallmentDate = date;
    
    if (this.formData.installment_count > 1 && this.getTotalValue() > 0 && date) {
      this.generateInstallments();
    }
  }

  private generateInstallments() {
    if (this.getTotalValue() <= 0 || this.formData.installment_count <= 1 || !this.firstInstallmentDate) {
      return;
    }

    this.contractInstallments = this.contractService.generateInstallments(
      this.getTotalValue(),
      this.formData.installment_count,
      this.firstInstallmentDate,
      30 // intervalo padrão de 30 dias
    );

    // Atualizar data prevista para pagamento com a data da última parcela
    if (this.contractInstallments.length > 0) {
      const lastInstallment = this.contractInstallments[this.contractInstallments.length - 1];
      this.formData.expected_payment_date = lastInstallment.due_date;
    }
  }

  onPaymentMethodChange() {
    // Resetar parcelamento se forma de pagamento não permitir
    if (!this.isPaymentMethodInstallable(this.formData.payment_method)) {
      this.formData.installment_count = 1;
      this.contractInstallments = [];
      // Resetar data prevista para pagamento quando não há parcelamento
      this.formData.expected_payment_date = '';
    }
  }

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServices.some((s) => s.service_id === serviceId);
  }

  isPaymentMethodInstallable(paymentMethod: string): boolean {
    return this.contractService.isPaymentMethodInstallable(paymentMethod);
  }
}