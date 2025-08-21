// src/app/components/proposal-to-contract-modal/proposal-to-contract-modal.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Proposal, ProposalService } from '../../services/proposal';
import { ContractService, CreateContractRequest, ContractServiceItem, ContractInstallment } from '../../services/contract';
import { UserService } from '../../services/user';
import { ModalService } from '../../services/modal.service';
import { UserSelectionModalComponent } from '../user-selection-modal/user-selection-modal';

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
  role: 'editor' | 'viewer';
}

interface ContractConversionData {
  start_date: string;
  end_date: string;
  payment_method: string;
  expected_payment_date: string;
  payment_status: 'pago' | 'pendente';
  installment_count: number;
  notes: string;
}

@Component({
  selector: 'app-proposal-to-contract-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSelectionModalComponent],
  templateUrl: './proposal-to-contract-modal.html',
  styleUrls: ['./proposal-to-contract-modal.css']
})
export class ProposalToContractModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() proposal: Proposal | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() converted = new EventEmitter<any>();

  private contractService = inject(ContractService);
  private proposalService = inject(ProposalService);
  private userService = inject(UserService);
  private modalService = inject(ModalService);

  contractData: ContractConversionData = {
    start_date: '',
    end_date: '',
    payment_method: '',
    expected_payment_date: '',
    payment_status: 'pendente',
    installment_count: 1,
    notes: ''
  };

  assignedUsers: AssignedUser[] = [];
  allUsers: AssignableUser[] = [];
  isUserModalOpen = false;
  isLoading = false;
  today = new Date().toISOString().split('T')[0];
  
  paymentMethods = this.contractService.getPaymentMethods();
  contractInstallments: ContractInstallment[] = [];
  firstInstallmentDate: string = '';

  ngOnInit() {
    this.loadUsers();
    // Set default start date to today
    this.contractData.start_date = this.today;
  }

  ngOnChanges() {
    if (this.proposal && this.isOpen) {
      console.log('🔧 Modal opened with proposal:', this.proposal);
      this.loadCompleteProposal();
    }
  }

  async loadCompleteProposal() {
    if (!this.proposal?.id) return;
    
    try {
      console.log('🔧 Fetching complete proposal data for ID:', this.proposal.id);
      const response = await firstValueFrom(this.proposalService.getProposal(this.proposal.id));
      
      if (response.success && response.data) {
        console.log('🔧 Complete proposal fetched:', response.data);
        console.log('🔧 Complete proposal services:', response.data.services);
        console.log('🔧 Complete proposal keys:', Object.keys(response.data));
        
        // Update the proposal with complete data
        this.proposal = response.data;
        
        // Check all possible service properties
        const proposalAny = this.proposal as any;
        console.log('🔧 Checking proposal_services:', proposalAny.proposal_services);
        console.log('🔧 Checking service_items:', proposalAny.service_items);
        console.log('🔧 Checking items:', proposalAny.items);
        console.log('🔧 Checking proposalServices:', proposalAny.proposalServices);
        console.log('🔧 Checking servicesList:', proposalAny.servicesList);
        
        // Log the full structure to identify the correct path
        for (const key in proposalAny) {
          if (Array.isArray(proposalAny[key])) {
            console.log(`🔧 Found array property "${key}":`, proposalAny[key]);
          }
        }
      } else {
        console.error('❌ Failed to fetch complete proposal:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching complete proposal:', error);
    }
  }

  async loadUsers() {
    try {
      const response = await firstValueFrom(this.userService.getUsers());
      this.allUsers = response.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  formatCurrency(value: number): string {
    return this.contractService.formatValue(value);
  }

  getClientName(): string {
    if (!this.proposal) return '';
    
    // Try client_name first (direct field)
    if (this.proposal.client_name) {
      return this.proposal.client_name;
    }
    
    // Try nested client structure with type safety
    if (this.proposal.client) {
      const client = this.proposal.client as any;
      
      if (client.clients_pf?.full_name) {
        return client.clients_pf.full_name;
      }
      if (client.clients_pj?.company_name) {
        return client.clients_pj.company_name;
      }
      if (client.name) {
        return client.name;
      }
    }
    
    return 'Cliente não identificado';
  }

  getProposalServices(): any[] {
    if (!this.proposal) return [];
    
    const proposalAny = this.proposal as any;
    
    // Array of possible service property names to check
    const possibleServiceProperties = [
      'services',
      'proposal_services', 
      'service_items',
      'items',
      'proposalServices',
      'servicesList',
      'proposal_service_items',
      'contract_services'
    ];
    
    console.log('🔍 Searching for services in proposal...');
    
    for (const property of possibleServiceProperties) {
      if (proposalAny[property] && Array.isArray(proposalAny[property]) && proposalAny[property].length > 0) {
        console.log(`✅ Found services in proposal.${property}:`, proposalAny[property]);
        return proposalAny[property];
      }
    }
    
    // If no services found, log all array properties for debugging
    console.log('🔍 All array properties in proposal:');
    for (const key in proposalAny) {
      if (Array.isArray(proposalAny[key])) {
        console.log(`  - ${key}: Array(${proposalAny[key].length})`, proposalAny[key]);
      }
    }
    
    console.warn('❌ No services found in any expected property');
    return [];
  }

  isPaymentMethodInstallable(method: string): boolean {
    return this.contractService.isPaymentMethodInstallable(method);
  }

  onPaymentMethodChange() {
    if (!this.isPaymentMethodInstallable(this.contractData.payment_method)) {
      this.contractData.installment_count = 1;
      this.contractInstallments = [];
      this.firstInstallmentDate = '';
    }
  }

  onInstallmentCountChange(count: number) {
    this.contractData.installment_count = count;
    if (count > 1 && this.firstInstallmentDate) {
      this.generateInstallments();
    } else {
      this.contractInstallments = [];
    }
  }

  onFirstInstallmentDateChange(date: string) {
    this.firstInstallmentDate = date;
    if (this.contractData.installment_count > 1 && date) {
      this.generateInstallments();
    }
  }

  generateInstallments() {
    if (!this.proposal || this.contractData.installment_count <= 1 || !this.firstInstallmentDate) {
      this.contractInstallments = [];
      return;
    }

    const totalValue = this.proposal.total_value;
    const installmentValue = totalValue / this.contractData.installment_count;
    const firstDate = new Date(this.firstInstallmentDate);

    this.contractInstallments = [];
    for (let i = 0; i < this.contractData.installment_count; i++) {
      const dueDate = new Date(firstDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      this.contractInstallments.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount: installmentValue,
        notes: null
      });
    }

    // Update expected payment date to last installment
    if (this.contractInstallments.length > 0) {
      const lastInstallment = this.contractInstallments[this.contractInstallments.length - 1];
      this.contractData.expected_payment_date = lastInstallment.due_date;
    }
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
    
    // Add new users
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

    // Remove users not in selection
    this.assignedUsers = this.assignedUsers.filter(u => selectedIds.includes(u.user.id));
    this.closeUserModal();
  }

  removeUser(userToRemove: AssignedUser): void {
    const userIndex = this.assignedUsers.findIndex(u => u.user.id === userToRemove.user.id);
    if (userIndex > -1) {
      this.assignedUsers.splice(userIndex, 1);
    }
  }

  async onSubmit() {
    console.log('📋 Proposal data received:', this.proposal);
    console.log('🔍 Services structure:', this.proposal?.services);
    console.log('🔍 Services length:', this.proposal?.services?.length);
    
    if (!this.proposal) {
      this.modalService.showError('Dados da proposta não encontrados.');
      return;
    }

    if (!this.contractData.start_date) {
      this.modalService.showError('Data de início é obrigatória.');
      return;
    }

    // Check if services exist in any possible structure
    const services = this.proposal.services || [];
    console.log('🔍 Services array:', services);
    
    // More flexible validation - warn but don't block if no services
    if (services.length === 0) {
      console.warn('⚠️ No services found in proposal, but proceeding with conversion');
      // this.modalService.showError('A proposta deve ter pelo menos um serviço para ser convertida.');
      // return;
    }

    if (!this.proposal.client_id) {
      this.modalService.showError('Dados do cliente não encontrados na proposta.');
      return;
    }

    this.isLoading = true;

    try {
      // Try to find services in different possible properties
      const proposalServices = this.getProposalServices();
      console.log('🔄 Converting services:', proposalServices);
      
      if (proposalServices.length === 0) {
        this.modalService.showError('Não foi possível encontrar serviços na proposta. Verifique se a proposta possui serviços configurados.');
        this.isLoading = false;
        return;
      }
      
      const services: ContractServiceItem[] = proposalServices.map(service => {
        console.log('🔄 Individual service:', service);
        return {
          service_id: service.service_id,
          unit_value: service.unit_value || 0
        };
      });

      // Prepare user assignments
      const assignedUserIds = this.assignedUsers.map(u => u.user.id);

      // Create contract request
      const contractRequest: CreateContractRequest = {
        client_id: this.proposal.client_id,
        type: this.proposal.type,
        start_date: this.contractData.start_date,
        end_date: this.contractData.end_date || null,
        services: services,
        notes: this.contractData.notes || null,
        assigned_users: assignedUserIds,
        payment_method: this.contractData.payment_method || null,
        expected_payment_date: this.contractData.expected_payment_date || null,
        payment_status: this.contractData.payment_status,
        installment_count: this.contractData.installment_count,
        installments: this.contractInstallments
      };

      // Create the contract
      const contractResponse = await firstValueFrom(
        this.contractService.createContract(contractRequest)
      );

      if (contractResponse.contract?.id) {
        // Apply user permissions if any
        await this.applyUserPermissions(contractResponse.contract.id);

        // Update proposal status to converted
        await this.updateProposalStatus(this.proposal.id, contractResponse.contract.id);

        this.modalService.showSuccess(
          `Proposta convertida com sucesso!\nContrato criado: ${contractResponse.contract.contract_number}`
        );

        this.converted.emit({
          contractId: contractResponse.contract.id,
          contractNumber: contractResponse.contract.contract_number
        });

        this.close.emit();
      } else {
        throw new Error('Contract ID not returned');
      }

    } catch (error: any) {
      console.error('Error converting proposal to contract:', error);
      this.modalService.showError(
        error.error?.message || 'Erro ao converter proposta em contrato. Tente novamente.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  private async applyUserPermissions(contractId: number): Promise<void> {
    for (const assignedUser of this.assignedUsers) {
      try {
        await firstValueFrom(
          this.contractService.updateUserRole(contractId, assignedUser.user.id, assignedUser.role)
        );
      } catch (error) {
        console.error(`Error applying permission for user ${assignedUser.user.name}:`, error);
        // Don't fail the whole conversion for permission errors
      }
    }
  }

  private async updateProposalStatus(proposalId: number, contractId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.proposalService.markAsConverted(proposalId, contractId)
      );
    } catch (error) {
      console.error('Error updating proposal status:', error);
      // Don't fail the whole conversion for status update errors
    }
  }
}