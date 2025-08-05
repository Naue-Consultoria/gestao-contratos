import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContractService, CreateContractRequest, UpdateContractRequest, ContractServiceItem } from '../../services/contract';
import { ClientService, ApiClient } from '../../services/client';
import { ServiceService, ApiService } from '../../services/service';
import { ModalService } from '../../services/modal.service';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';
import { UserSelectionModalComponent } from '../user-selection-modal/user-selection-modal';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';

interface SelectedService {
  service_id: number;
  name: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  duration: number;
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
  imports: [CommonModule, FormsModule, UserSelectionModalComponent, CurrencyMaskDirective],
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

  formData: any = {
    contract_number: '',
    client_id: null as number | null,
    type: 'Full' as 'Full' | 'Pontual' | 'Individual',
    status: 'active' as 'active' | 'completed' | 'cancelled' | 'suspended',
    start_date: '',
    end_date: '',
    notes: '',
    assigned_users: [] as number[],
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
  
  availableRoles = [
    { value: 'owner', label: 'Proprietário' },
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
      this.loadContract();
    } else {
      this.generateContractNumber();
      this.isLoading = false;
    }

    this.loadInitialData();
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
          assigned_users:
            contract.assigned_users?.map((u: any) => u.user.id) || [],
        };
        this.selectedServices = contract.contract_services.map((cs: any) => ({
          service_id: cs.service.id,
          name: cs.service.name,
          quantity: cs.quantity,
          unit_value: cs.unit_value,
          total_value: cs.total_value,
          duration: cs.service.duration,
          duration_unit: cs.service.duration_unit,
          category: cs.service.category,
        }));
        this.assignedUsers = contract.assigned_users || [];
      }
    } catch (error) {
      this.modalService.showError('Erro ao carregar contrato');
      this.router.navigate(['/home/contracts']);
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
    return this.availableRoles.find(r => r.value === roleValue)?.label || roleValue;
  }

  get filteredServices(): ApiService[] {
    if (!this.serviceSearchTerm) return this.availableServices;
    const search = this.serviceSearchTerm.toLowerCase();
    return this.availableServices.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.category?.toLowerCase().includes(search)
    );
  }

  formatDate(dateString: string): string {
    return this.contractService.formatDate(dateString);
  }

  formatServiceDuration(service: ApiService): string {
    return this.serviceService.formatDuration(service.duration_amount, service.duration_unit);
  }

  openServiceModal() {
    this.showServiceModal = true;
    this.serviceSearchTerm = '';
  }
  closeServiceModal() {
    this.showServiceModal = false;
    this.serviceSearchTerm = '';
  }

  addService(service: ApiService) {
    if (this.isServiceSelected(service.id)) {
      this.modalService.showWarning('Serviço já adicionado');
      return;
    }
    this.selectedServices.push({
      service_id: service.id,
      name: service.name,
      quantity: 1,
      unit_value: 0,
      total_value: 0,
      duration: service.duration_amount,
      duration_unit: service.duration_unit,
      category: service.category || 'Geral',
    });
    this.closeServiceModal();
  }

  removeService(index: number) {
    this.selectedServices.splice(index, 1);
  }

  updateServiceQuantity(index: number, quantity: number) {
    const service = this.selectedServices[index];
    if (quantity < 1) {
      service.quantity = 1;
    }
    service.total_value = service.unit_value * service.quantity;
    
    // Força a atualização do formulário
    this.formData.total_value = this.getTotalValue();
  }

  updateServicePrice(index: number, priceInReais: number) {
    const service = this.selectedServices[index];
    if (priceInReais < 0) {
        priceInReais = 0;
    }
    service.unit_value = priceInReais;
    service.total_value = service.unit_value * service.quantity;
    
    // Força a atualização do formulário
    this.formData.total_value = this.getTotalValue();
  }

  // Método chamado pelo directive quando o valor muda (recebe reais)
  onPriceChange(index: number, priceInReais: number) {
    const service = this.selectedServices[index];
    service.unit_value = priceInReais;
    service.total_value = service.unit_value * service.quantity;
    
    // Força a atualização do formulário
    this.formData.total_value = this.getTotalValue();
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

  updateAssignedUsers(selectedIds: number[]): void {
    this.formData.assigned_users = selectedIds;
  }

  getSelectedUserNames(): string {
    if (this.formData.assigned_users.length === 0) {
      return 'Nenhum usuário selecionado';
    }
    return this.formData.assigned_users
      .map((id: number) => this.allUsers.find(user => user.id === id)?.name)
      .filter((name?: string): name is string => !!name)
      .join(', ');
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

    try {
      const services: ContractServiceItem[] = this.selectedServices.map(
        (s) => ({
          service_id: s.service_id,
          quantity: s.quantity,
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
          assigned_users: this.formData.assigned_users,
        };
        await firstValueFrom(
          this.contractService.updateContract(this.contractId, updateData)
        );
        this.modalService.showSuccess('Contrato atualizado com sucesso!', 'Sucesso');
      } else {
        const createData: CreateContractRequest = {
          ...this.formData,
          client_id: this.formData.client_id!,
          end_date: this.formData.end_date || null,
          notes: this.formData.notes || null,
          services,
        };
        await firstValueFrom(this.contractService.createContract(createData));
        this.modalService.showSuccess('Contrato criado com sucesso!', 'Sucesso');
      }
      this.router.navigate(['/home/contracts']);
    } catch (error: any) {
      this.modalService.showError(error.error?.message || 'Erro ao salvar o contrato.', 'Erro');
    } finally {
      this.isSaving = false;
    }
  }

  cancel() {
    this.router.navigate(['/home/contracts']);
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
  isServiceSelected(serviceId: number): boolean {
    return this.selectedServices.some((s) => s.service_id === serviceId);
  }
}